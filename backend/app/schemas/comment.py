from pydantic import BaseModel
from datetime import datetime
from .user import UserOut


class CommentCreate(BaseModel):
    text: str


class CommentOut(BaseModel):
    id: str
    user_id: str
    post_id: str
    text: str
    created_at: datetime
    user: UserOut

    model_config = {"from_attributes": True}
