from pydantic import BaseModel
from datetime import datetime


class AchievementCreate(BaseModel):
    comment: str | None = None
    proof_post_id: str | None = None
    is_public: bool = True


class AchievementOut(BaseModel):
    id: str
    goal_text: str
    comment: str | None
    proof_post_id: str | None
    is_public: bool
    achieved_at: datetime

    model_config = {"from_attributes": True}
