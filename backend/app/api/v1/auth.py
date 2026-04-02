import uuid
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import JWTError

from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserOut
from app.schemas.auth import Token, RefreshRequest, GoogleAuthRequest, OnboardingRequest
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
)
from .users import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


def _make_token(user: User) -> Token:
    return Token(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        needs_onboarding=not user.is_onboarding_complete,
    )


@router.post("/register", response_model=Token, status_code=201)
async def register(
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

    # 仮ユーザー名（onboardingで上書きされる）
    temp_username = f"user_{uuid.uuid4().hex[:8]}"
    user = User(
        username=temp_username,
        email=email,
        hashed_password=hash_password(password),
        goal="",
        is_onboarding_complete=False,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return _make_token(user)


@router.post("/token", response_model=Token)
async def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    user = await db.scalar(select(User).where(User.email == form.username))
    if not user or not user.hashed_password or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return _make_token(user)


@router.post("/google", response_model=Token)
async def google_auth(
    body: GoogleAuthRequest,
    db: AsyncSession = Depends(get_db),
):
    # Google ID tokenを検証
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

    # 既存ユーザーをgoogle_idまたはemailで検索
    user = await db.scalar(select(User).where(User.google_id == google_id))
    if not user:
        user = await db.scalar(select(User).where(User.email == email))

    if user:
        # 既存ユーザーにgoogle_idを紐付け
        if not user.google_id:
            user.google_id = google_id
            await db.commit()
    else:
        # 新規ユーザー作成
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
        await db.commit()
        await db.refresh(user)

    return _make_token(user)


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

    # ユーザー名の重複チェック（自分以外）
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
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/refresh", response_model=Token)
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    try:
        user_id = decode_refresh_token(body.refresh_token)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    user = await db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return _make_token(user)
