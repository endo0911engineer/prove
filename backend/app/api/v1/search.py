from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, String, cast
import asyncio

from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserOut
from .users import get_current_user, _with_counts

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/users", response_model=list[UserOut])
async def search_users(
    q: str | None = Query(None),
    tags: list[str] | None = Query(None),
    sort: str = Query("streak"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(User).where(User.id != current_user.id)

    if q:
        query = query.where(User.username.ilike(f"%{q}%"))

    if tags:
        for tag in tags:
            # JSON配列にタグが含まれるか（テキストとして検索）
            query = query.where(
                cast(User.tags, String).ilike(f'%"{tag}"%')
            )

    if sort == "streak":
        query = query.order_by(User.current_streak.desc())
    else:
        query = query.order_by(User.created_at.desc())

    query = query.offset(skip).limit(limit)
    users = await db.scalars(query)
    results = await asyncio.gather(*[_with_counts(u, db) for u in users])
    return list(results)
