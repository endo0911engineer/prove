import uuid
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import JWTError
from datetime import datetime, timezone

from app.db.session import get_db
from app.models.user import User
from app.models.goal import Goal
from app.models.refresh_token import RefreshToken
from app.schemas.user import UserOut
from app.schemas.auth import Token, RefreshRequest, GoogleAuthRequest, OnboardingRequest
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_token,
    refresh_token_expires_at,
)
from app.core.limiter import limiter
from .users import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


async def _issue_tokens(user: User, db: AsyncSession) -> Token:
    """アクセストークン＋リフレッシュトークンを発行しDBに保存する"""
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    db.add(RefreshToken(
        user_id=user.id,
        token_hash=hash_token(refresh_token),
        expires_at=refresh_token_expires_at(),
    ))
    await db.commit()

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        needs_onboarding=not user.is_onboarding_complete,
    )


@router.post("/register", response_model=Token, status_code=201)
@limiter.limit("5/minute")
async def register(
    request: Request,
    data: dict,
    db: AsyncSession = Depends(get_db),
):
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password required")

    existing = await db.scalar(select(User).where(User.email == email))
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    temp_username = f"user_{uuid.uuid4().hex[:8]}"
    user = User(
        username=temp_username,
        email=email,
        hashed_password=hash_password(password),
        goal="",
        is_onboarding_complete=False,
    )
    db.add(user)
    await db.flush()  # IDを確定させてからトークン発行
    return await _issue_tokens(user, db)


@router.post("/token", response_model=Token)
@limiter.limit("10/minute")
async def login(
    request: Request,
    form: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    user = await db.scalar(select(User).where(User.email == form.username))
    if not user or not user.hashed_password or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return await _issue_tokens(user, db)


@router.post("/google", response_model=Token)
@limiter.limit("10/minute")
async def google_auth(
    request: Request,
    body: GoogleAuthRequest,
    db: AsyncSession = Depends(get_db),
):
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": body.id_token},
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Invalid Google token")

    payload = resp.json()
    google_id = payload.get("sub")
    email = payload.get("email", "").lower()
    if not google_id or not email:
        raise HTTPException(status_code=400, detail="Invalid Google token payload")

    user = await db.scalar(select(User).where(User.google_id == google_id))
    if not user:
        user = await db.scalar(select(User).where(User.email == email))

    if user:
        if not user.google_id:
            user.google_id = google_id
            await db.flush()
    else:
        temp_username = f"user_{uuid.uuid4().hex[:8]}"
        user = User(
            username=temp_username,
            email=email,
            google_id=google_id,
            hashed_password=None,
            goal="",
            is_onboarding_complete=False,
        )
        db.add(user)
        await db.flush()

    return await _issue_tokens(user, db)


@router.post("/onboarding", response_model=UserOut)
async def complete_onboarding(
    body: OnboardingRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    username = body.username.strip()
    goal = body.goal.strip()
    if not username or not goal:
        raise HTTPException(status_code=400, detail="Username and goal are required")

    existing = await db.scalar(
        select(User).where(User.username == username, User.id != current_user.id)
    )
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")

    current_user.username = username
    current_user.goal = goal
    current_user.posting_window_start = body.posting_window_start
    current_user.posting_window_end = body.posting_window_end
    current_user.is_onboarding_complete = True

    new_goal = Goal(user_id=current_user.id, title=goal, is_active=True)
    db.add(new_goal)

    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/refresh", response_model=Token)
@limiter.limit("20/minute")
async def refresh(request: Request, body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    # JWTを検証してuser_idを取得
    try:
        user_id = decode_refresh_token(body.refresh_token)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    # DBでトークンを検索
    token_hash = hash_token(body.refresh_token)
    stored = await db.scalar(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )

    if not stored:
        # DBに存在しないトークン → 盗用の可能性。そのユーザーの全トークンを失効
        await _revoke_all_for_user(user_id, db)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    if stored.revoked:
        # 使用済みトークンの再利用 → 盗用の可能性。全トークンを失効
        await _revoke_all_for_user(stored.user_id, db)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token already used")

    if stored.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired")

    # 古いトークンを失効させる（ローテーション）
    stored.revoked = True
    await db.flush()

    user = await db.scalar(select(User).where(User.id == stored.user_id))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return await _issue_tokens(user, db)


@router.post("/logout", status_code=204)
async def logout(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """リフレッシュトークンをDBで失効させる"""
    try:
        decode_refresh_token(body.refresh_token)
    except JWTError:
        return  # 無効なトークンでも204を返す（冪等）

    token_hash = hash_token(body.refresh_token)
    stored = await db.scalar(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    if stored and not stored.revoked:
        stored.revoked = True
        await db.commit()


async def _revoke_all_for_user(user_id: str, db: AsyncSession) -> None:
    """ユーザーの全リフレッシュトークンを失効（盗用検知時）"""
    tokens = await db.scalars(
        select(RefreshToken).where(
            RefreshToken.user_id == user_id,
            RefreshToken.revoked == False,
        )
    )
    for t in tokens:
        t.revoked = True
    await db.commit()
