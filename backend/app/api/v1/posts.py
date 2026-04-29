from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.db.session import get_db
from app.models.post import Post, PostStatus
from app.models.comment import Comment
from app.models.goal import Goal
from app.models.user import User
from app.schemas.post import PostOut
from app.core.storage import upload_image
from app.core.file_validation import validate_image_bytes
from app.core.limiter import limiter
from .users import get_current_user, check_can_view

router = APIRouter(prefix="/posts", tags=["posts"])


def _user_tz(user: User) -> ZoneInfo:
    try:
        return ZoneInfo(user.timezone)
    except (ZoneInfoNotFoundError, Exception):
        return ZoneInfo("Asia/Tokyo")


def today_range_for_user(user: User) -> tuple[datetime, datetime]:
    tz = _user_tz(user)
    today = datetime.now(tz).date()
    start = datetime(today.year, today.month, today.day, tzinfo=tz)
    return start, start + timedelta(days=1)


@router.get("/today")
async def today_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    day_start, day_end = today_range_for_user(current_user)

    post = await db.scalar(
        select(Post)
        .where(Post.user_id == current_user.id)
        .where(Post.created_at >= day_start)
        .where(Post.created_at < day_end)
    )

    status = PostStatus.POSTED if post else PostStatus.NOT_POSTED

    return {
        "status": status,
        "streak": current_user.current_streak,
        "max_streak": current_user.max_streak,
        "timezone": current_user.timezone,
    }


@router.post("", response_model=PostOut, status_code=201)
@limiter.limit("5/5minute")
async def create_post(
    request: Request,
    image: UploadFile = File(...),
    text: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    day_start, day_end = today_range_for_user(current_user)

    existing = await db.scalar(
        select(Post)
        .where(Post.user_id == current_user.id)
        .where(Post.created_at >= day_start)
        .where(Post.created_at < day_end)
    )
    if existing:
        raise HTTPException(status_code=400, detail="Already posted today")

    image_bytes = await image.read()
    validate_image_bytes(image_bytes)
    image_url = upload_image(image_bytes, image.content_type or "image/jpeg")

    active_goal = await db.scalar(
        select(Goal).where(Goal.user_id == current_user.id, Goal.is_active == True)
    )

    post = Post(
        user_id=current_user.id,
        goal_id=active_goal.id if active_goal else None,
        image_url=image_url,
        text=text,
        status=PostStatus.POSTED,
    )
    db.add(post)

    yesterday_start = day_start - timedelta(days=1)
    yesterday_post = await db.scalar(
        select(Post)
        .where(Post.user_id == current_user.id)
        .where(Post.created_at >= yesterday_start)
        .where(Post.created_at < day_start)
    )
    if yesterday_post:
        current_user.current_streak += 1
    else:
        current_user.current_streak = 1

    if current_user.current_streak > current_user.max_streak:
        current_user.max_streak = current_user.current_streak

    await db.commit()
    await db.refresh(post)

    post_with_relations = await db.scalar(
        select(Post)
        .options(
            selectinload(Post.user),
            selectinload(Post.reactions),
            selectinload(Post.comments).selectinload(Comment.user),
        )
        .where(Post.id == post.id)
    )
    return post_with_relations


@router.get("/{post_id}", response_model=PostOut)
async def get_post(
    post_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = await db.scalar(
        select(Post)
        .options(
            selectinload(Post.user),
            selectinload(Post.reactions),
            selectinload(Post.comments).selectinload(Comment.user),
        )
        .where(Post.id == post_id)
    )
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    await check_can_view(current_user, post.user, db)
    return post
