from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
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
from app.models.goal import Goal
from app.schemas.user import UserOut, UserUpdate
from app.schemas.post import PostOut
from app.core.security import decode_token
from app.core.storage import upload_image
from app.core.file_validation import validate_image_bytes

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


async def check_can_view(viewer: User, target_user: User, db: AsyncSession) -> None:
    """非公開ユーザーのコンテンツにアクセスできるか確認。不可なら 403 を送出。"""
    if not target_user.is_private:
        return
    if viewer.id == target_user.id:
        return
    is_following = await db.scalar(
        select(Follow).where(
            Follow.follower_id == viewer.id,
            Follow.following_id == target_user.id,
        )
    )
    if not is_following:
        raise HTTPException(status_code=403, detail="This account is private")


async def _with_counts(user: User, db: AsyncSession) -> UserOut:
    """フォロワー数・フォロー数を付与して UserOut を返す（単一ユーザー用）"""
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


async def _batch_with_counts(users: list[User], db: AsyncSession) -> list[UserOut]:
    """複数ユーザーのフォロワー数・フォロー数を2クエリで一括取得する（N+1対策）"""
    if not users:
        return []
    user_ids = [u.id for u in users]

    follower_rows = await db.execute(
        select(Follow.following_id, func.count().label("cnt"))
        .where(Follow.following_id.in_(user_ids))
        .group_by(Follow.following_id)
    )
    follower_map: dict[str, int] = {row.following_id: row.cnt for row in follower_rows}

    following_rows = await db.execute(
        select(Follow.follower_id, func.count().label("cnt"))
        .where(Follow.follower_id.in_(user_ids))
        .group_by(Follow.follower_id)
    )
    following_map: dict[str, int] = {row.follower_id: row.cnt for row in following_rows}

    return [
        UserOut.model_validate({
            **{c.name: getattr(u, c.name) for c in u.__table__.columns},
            "follower_count": follower_map.get(u.id, 0),
            "following_count": following_map.get(u.id, 0),
        })
        for u in users
    ]


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
    validate_image_bytes(image_bytes)
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
async def get_user_posts(
    user_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    target = await db.scalar(select(User).where(User.id == user_id))
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    await check_can_view(current_user, target, db)

    posts = await db.scalars(
        select(Post)
        .options(
            selectinload(Post.user),
            selectinload(Post.reactions),
            selectinload(Post.comments).selectinload(Comment.user),
        )
        .where(Post.user_id == user_id)
        .order_by(Post.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return list(posts)
