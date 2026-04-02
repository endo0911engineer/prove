from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.user import User
from app.models.goal_achievement import GoalAchievement
from app.schemas.achievement import AchievementCreate, AchievementOut
from .users import get_current_user

router = APIRouter(prefix="/achievements", tags=["achievements"])


@router.post("", response_model=AchievementOut, status_code=201)
async def achieve_goal(
    data: AchievementCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    achievement = GoalAchievement(
        user_id=current_user.id,
        goal_text=current_user.goal,
        comment=data.comment,
        proof_post_id=data.proof_post_id,
        is_public=data.is_public,
    )
    db.add(achievement)
    await db.commit()
    await db.refresh(achievement)
    return achievement


@router.get("/me", response_model=list[AchievementOut])
async def my_achievements(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    results = await db.scalars(
        select(GoalAchievement)
        .where(GoalAchievement.user_id == current_user.id)
        .order_by(GoalAchievement.achieved_at.desc())
    )
    return list(results)


@router.get("/user/{user_id}", response_model=list[AchievementOut])
async def user_achievements(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    results = await db.scalars(
        select(GoalAchievement)
        .where(
            GoalAchievement.user_id == user_id,
            GoalAchievement.is_public == True,
        )
        .order_by(GoalAchievement.achieved_at.desc())
    )
    return list(results)
