from pydantic import BaseModel
from datetime import datetime
from app.models.post import PostStatus
from .user import UserOut
from .reaction import ReactionOut
from .comment import CommentOut


class PostCreate(BaseModel):
    text: str | None = None


class PostOut(BaseModel):
    id: str
    user_id: str
    user: UserOut
    image_url: str
    text: str | None
    status: PostStatus
    created_at: datetime
    reactions: list[ReactionOut] = []
    comments: list[CommentOut] = []

    model_config = {"from_attributes": True}
