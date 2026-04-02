from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from datetime import datetime, timedelta, timezone

from app.db.session import get_db
from app.models.post import Post, PostStatus
from app.models.comment import Comment
from app.models.user import User
from app.schemas.post import PostOut
from app.core.storage import upload_image
from .users import get_current_user

router = APIRouter(prefix="/posts", tags=["posts"])

JST = timezone(timedelta(hours=9))


def today_range_jst() -> tuple[datetime, datetime]:
    """今日(JST)の開始〜終了(UTC)を返す"""
    today = datetime.now(JST).date()
    start = datetime(today.year, today.month, today.day, tzinfo=JST)
    return start, start + timedelta(days=1)


def window_range_jst(user: User) -> tuple[datetime, datetime]:
    """ユーザーの投稿可能ウィンドウ(JST)の開始〜終了(UTC)を返す"""
    today = datetime.now(JST).date()
    window_start = datetime(
        today.year, today.month, today.day,
        user.posting_window_start, 0, 0, tzinfo=JST
    )
    window_end = datetime(
        today.year, today.month, today.day,
        user.posting_window_end, 0, 0, tzinfo=JST
    )
    # 終了が開始より早い場合(例: 23時→翌1時)は翌日扱い
    if window_end <= window_start:
        window_end += timedelta(days=1)
    return window_start, window_end


@router.get("/today")
async def today_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    day_start, day_end = today_range_jst()
    now_jst = datetime.now(JST)

    post = await db.scalar(
        select(Post)
        .where(Post.user_id == current_user.id)
        .where(Post.created_at >= day_start)
        .where(Post.created_at < day_end)
    )

    if post:
        status = PostStatus.POSTED
    else:
        window_start, window_end = window_range_jst(current_user)
        if now_jst > window_end:
            # 投稿ウィンドウが終了しているのに未投稿 → MISSED
            status = PostStatus.MISSED
        else:
            status = PostStatus.NOT_POSTED

    return {
        "status": status,
        "streak": current_user.current_streak,
        "max_streak": current_user.max_streak,
        "posting_window_start": current_user.posting_window_start,
        "posting_window_end": current_user.posting_window_end,
    }


@router.post("", response_model=PostOut, status_code=201)
async def create_post(
    image: UploadFile = File(...),
    text: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now_jst = datetime.now(JST)
    day_start, day_end = today_range_jst()
    window_start, window_end = window_range_jst(current_user)

    # 投稿ウィンドウ外はブロック
    if now_jst < window_start:
        raise HTTPException(
            status_code=400,
            detail=f"Posting window hasn't started yet. Opens at {current_user.posting_window_start}:00"
        )
    if now_jst > window_end:
        raise HTTPException(
            status_code=400,
            detail=f"Posting window has closed. It ended at {current_user.posting_window_end}:00"
        )

    # 1日1投稿チェック
    existing = await db.scalar(
        select(Post)
        .where(Post.user_id == current_user.id)
        .where(Post.created_at >= day_start)
        .where(Post.created_at < day_end)
    )
    if existing:
        raise HTTPException(status_code=400, detail="Already posted today")

    image_bytes = await image.read()
    image_url = upload_image(image_bytes, image.content_type or "image/jpeg")

    post = Post(
        user_id=current_user.id,
        image_url=image_url,
        text=text,
        status=PostStatus.POSTED,
    )
    db.add(post)

    # ストリーク更新
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
async def get_post(post_id: str, db: AsyncSession = Depends(get_db)):
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
    return post
