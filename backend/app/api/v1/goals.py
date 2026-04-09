from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.session import get_db
from app.models.goal import Goal
from app.models.post import Post
from app.models.comment import Comment
from app.schemas.goal import GoalOut
from app.schemas.post import PostOut
from sqlalchemy.orm import selectinload
from app.models.follow import Follow
from app.models.user import User
from .users import get_current_user, check_can_view

router = APIRouter(tags=["goals"])


async def _goal_with_count(goal: Goal, db: AsyncSession) -> GoalOut:
    count = await db.scalar(
        select(func.count()).where(Post.goal_id == goal.id)
    ) or 0
    return GoalOut(
        id=goal.id,
        user_id=goal.user_id,
        title=goal.title,
        is_active=goal.is_active,
        achieved_at=goal.achieved_at,
        created_at=goal.created_at,
        post_count=count,
    )


@router.get("/users/me/goals", response_model=list[GoalOut])
async def get_my_goals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goals = await db.scalars(
        select(Goal)
        .where(Goal.user_id == current_user.id)
        .order_by(Goal.is_active.desc(), Goal.created_at.desc())
    )
    return [await _goal_with_count(g, db) for g in goals]


@router.get("/users/{user_id}/goals", response_model=list[GoalOut])
async def get_user_goals(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    target = await db.scalar(select(User).where(User.id == user_id))
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    await check_can_view(current_user, target, db)

    goals = await db.scalars(
        select(Goal)
        .where(Goal.user_id == user_id)
        .order_by(Goal.is_active.desc(), Goal.created_at.desc())
    )
    return [await _goal_with_count(g, db) for g in goals]


@router.get("/goals/{goal_id}/posts", response_model=list[PostOut])
async def get_goal_posts(
    goal_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goal = await db.scalar(select(Goal).where(Goal.id == goal_id))
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    owner = await db.scalar(select(User).where(User.id == goal.user_id))
    if owner:
        await check_can_view(current_user, owner, db)

    posts = await db.scalars(
        select(Post)
        .options(
            selectinload(Post.user),
            selectinload(Post.reactions),
            selectinload(Post.comments).selectinload(Comment.user),
        )
        .where(Post.goal_id == goal_id)
        .order_by(Post.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return list(posts)
