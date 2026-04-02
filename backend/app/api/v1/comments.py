from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.db.session import get_db
from app.models.comment import Comment
from app.models.post import Post
from app.models.user import User
from app.schemas.comment import CommentCreate, CommentOut
from .users import get_current_user

router = APIRouter(tags=["comments"])


@router.post("/posts/{post_id}/comments", response_model=CommentOut, status_code=201)
async def add_comment(
    post_id: str,
    data: CommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = await db.scalar(select(Post).where(Post.id == post_id))
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    comment = Comment(user_id=current_user.id, post_id=post_id, text=data.text.strip())
    db.add(comment)
    await db.commit()
    await db.refresh(comment)

    comment_with_user = await db.scalar(
        select(Comment)
        .options(selectinload(Comment.user))
        .where(Comment.id == comment.id)
    )
    return comment_with_user


@router.get("/posts/{post_id}/comments", response_model=list[CommentOut])
async def get_comments(
    post_id: str,
    db: AsyncSession = Depends(get_db),
):
    comments = (
        await db.scalars(
            select(Comment)
            .options(selectinload(Comment.user))
            .where(Comment.post_id == post_id)
            .order_by(Comment.created_at)
        )
    ).all()
    return comments
