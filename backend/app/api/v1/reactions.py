from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.reaction import Reaction
from app.models.post import Post
from app.models.user import User
from app.schemas.reaction import ReactionCreate, ReactionOut
from .users import get_current_user

router = APIRouter(tags=["reactions"])


@router.post("/posts/{post_id}/reactions", status_code=200)
async def toggle_reaction(
    post_id: str,
    data: ReactionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = await db.scalar(select(Post).where(Post.id == post_id))
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # ユーザーのこの投稿への既存リアクションを検索
    existing = await db.scalar(
        select(Reaction).where(
            Reaction.user_id == current_user.id,
            Reaction.post_id == post_id,
        )
    )

    if existing:
        if existing.type == data.type:
            # 同じタイプ → 解除
            await db.delete(existing)
            await db.commit()
            return {"action": "removed"}
        else:
            # 別のタイプ → 差し替え
            existing.type = data.type
            await db.commit()
            await db.refresh(existing)
            return existing
    else:
        # 新規追加
        reaction = Reaction(user_id=current_user.id, post_id=post_id, type=data.type)
        db.add(reaction)
        await db.commit()
        await db.refresh(reaction)
        return reaction
