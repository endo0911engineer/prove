from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.post import Post
from app.models.comment import Comment
from app.models.follow import Follow
from app.models.user import User
from app.schemas.post import PostOut
from .users import get_current_user

router = APIRouter(prefix="/feed", tags=["feed"])

JST = timezone(timedelta(hours=9))


def _today_jst_range():
    now_jst = datetime.now(JST)
    start = now_jst.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=1)
    return start.astimezone(timezone.utc), end.astimezone(timezone.utc)


@router.get("", response_model=list[PostOut])
async def get_feed(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 今日投稿済みかチェック
    start_utc, end_utc = _today_jst_range()
    today_post = await db.scalar(
        select(Post).where(
            Post.user_id == current_user.id,
            Post.created_at >= start_utc,
            Post.created_at < end_utc,
        )
    )
    if not today_post:
        raise HTTPException(status_code=403, detail="Post today to view feed")

    follows = await db.scalars(
        select(Follow.following_id).where(Follow.follower_id == current_user.id)
    )
    following_ids = list(follows)

    same_goal_users = await db.scalars(
        select(User.id).where(
            User.id != current_user.id,
        )
    )
    same_goal_ids = list(same_goal_users)

    target_ids = list(set(following_ids + same_goal_ids))
    if not target_ids:
        return []

    posts = await db.scalars(
        select(Post)
        .options(
            selectinload(Post.user),
            selectinload(Post.reactions),
            selectinload(Post.comments).selectinload(Comment.user),
        )
        .where(Post.user_id.in_(target_ids))
        .order_by(Post.created_at.desc())
        .limit(50)
    )
    return list(posts)
