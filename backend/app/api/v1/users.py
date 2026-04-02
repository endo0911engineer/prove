from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from jose import JWTError

from app.db.session import get_db
from app.models.user import User
from app.models.post import Post
from app.models.comment import Comment
from app.models.follow import Follow
from app.schemas.user import UserOut, UserUpdate
from app.schemas.post import PostOut
from app.core.security import decode_token
from app.core.storage import upload_image

router = APIRouter(prefix="/users", tags=["users"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")


async def get_current_user(
    token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)
) -> User:
    try:
        user_id = decode_token(token)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def _with_counts(user: User, db: AsyncSession) -> UserOut:
    """フォロワー数・フォロー数を付与して UserOut を返す"""
    follower_count = await db.scalar(
        select(func.count()).where(Follow.following_id == user.id)
    ) or 0
    following_count = await db.scalar(
        select(func.count()).where(Follow.follower_id == user.id)
    ) or 0
    return UserOut.model_validate({
        **{c.name: getattr(user, c.name) for c in user.__table__.columns},
        "follower_count": follower_count,
        "following_count": following_count,
    })


@router.get("/me", response_model=UserOut)
async def me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _with_counts(current_user, db)


@router.patch("/me", response_model=UserOut)
async def update_profile(
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.bio is not None:
        current_user.bio = data.bio
    if data.avatar_emoji is not None:
        current_user.avatar_emoji = data.avatar_emoji
    if data.goal is not None:
        current_user.goal = data.goal
    if data.tags is not None:
        current_user.tags = data.tags
    if data.notification_enabled is not None:
        current_user.notification_enabled = data.notification_enabled
    if data.posting_window_start is not None:
        current_user.posting_window_start = data.posting_window_start
    if data.posting_window_end is not None:
        current_user.posting_window_end = data.posting_window_end
    if data.is_private is not None:
        current_user.is_private = data.is_private
    await db.commit()
    await db.refresh(current_user)
    return await _with_counts(current_user, db)


@router.post("/me/avatar", response_model=UserOut)
async def upload_avatar(
    image: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    image_bytes = await image.read()
    avatar_url = upload_image(image_bytes, image.content_type or "image/jpeg")
    current_user.avatar_url = avatar_url
    await db.commit()
    await db.refresh(current_user)
    return await _with_counts(current_user, db)


@router.get("/{user_id}", response_model=UserOut)
async def get_user(user_id: str, db: AsyncSession = Depends(get_db)):
    user = await db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return await _with_counts(user, db)


@router.get("/{user_id}/posts", response_model=list[PostOut])
async def get_user_posts(user_id: str, db: AsyncSession = Depends(get_db)):
    posts = await db.scalars(
        select(Post)
        .options(
            selectinload(Post.user),
            selectinload(Post.reactions),
            selectinload(Post.comments).selectinload(Comment.user),
        )
        .where(Post.user_id == user_id)
        .order_by(Post.created_at.desc())
    )
    return list(posts)
