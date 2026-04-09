from pydantic import BaseModel
from datetime import datetime


class GoalOut(BaseModel):
    id: str
    user_id: str
    title: str
    is_active: bool
    achieved_at: datetime | None = None
    created_at: datetime
    post_count: int = 0

    model_config = {"from_attributes": True}
