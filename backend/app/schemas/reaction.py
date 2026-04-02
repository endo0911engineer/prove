from pydantic import BaseModel
from datetime import datetime
from app.models.reaction import ReactionType


class ReactionCreate(BaseModel):
    type: ReactionType


class ReactionOut(BaseModel):
    id: str
    user_id: str
    post_id: str
    type: ReactionType
    created_at: datetime

    model_config = {"from_attributes": True}
