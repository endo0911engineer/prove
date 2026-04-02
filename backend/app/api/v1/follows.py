from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.follow import Follow
from app.models.user import User
from app.schemas.user import UserOut
from .users import get_current_user, _with_counts

router = APIRouter(tags=["follows"])


@router.post("/users/{user_id}/follow", status_code=204)
async def follow_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    existing = await db.scalar(
        select(Follow).where(
            Follow.follower_id == current_user.id,
            Follow.following_id == user_id,
        )
    )
    if existing:
        return

    db.add(Follow(follower_id=current_user.id, following_id=user_id))
    await db.commit()


@router.delete("/users/{user_id}/follow", status_code=204)
async def unfollow_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    follow = await db.scalar(
        select(Follow).where(
            Follow.follower_id == current_user.id,
            Follow.following_id == user_id,
        )
    )
    if follow:
        await db.delete(follow)
        await db.commit()


@router.get("/users/{user_id}/followers", response_model=list[UserOut])
async def get_followers(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    follower_ids = await db.scalars(
        select(Follow.follower_id).where(Follow.following_id == user_id)
    )
    users = await db.scalars(
        select(User).where(User.id.in_(list(follower_ids)))
    )
    return [await _with_counts(u, db) for u in users]


@router.get("/users/{user_id}/following", response_model=list[UserOut])
async def get_following(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    following_ids = await db.scalars(
        select(Follow.following_id).where(Follow.follower_id == user_id)
    )
    users = await db.scalars(
        select(User).where(User.id.in_(list(following_ids)))
    )
    return [await _with_counts(u, db) for u in users]


@router.get("/users/{user_id}/is_following")
async def is_following(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    follow = await db.scalar(
        select(Follow).where(
            Follow.follower_id == current_user.id,
            Follow.following_id == user_id,
        )
    )
    return {"is_following": follow is not None}
