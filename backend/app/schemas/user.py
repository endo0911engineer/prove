from pydantic import BaseModel, EmailStr
from datetime import datetime


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    goal: str


class UserUpdate(BaseModel):
    bio: str | None = None
    avatar_emoji: str | None = None
    goal: str | None = None
    tags: list[str] | None = None
    notification_enabled: bool | None = None
    posting_window_start: int | None = None
    posting_window_end: int | None = None
    is_private: bool | None = None


class UserOut(BaseModel):
    id: str
    username: str
    goal: str
    bio: str | None = None
    avatar_url: str | None = None
    tags: list[str] = []
    notification_enabled: bool = True
    posting_window_start: int = 0
    posting_window_end: int = 23
    is_private: bool = False
    current_streak: int
    max_streak: int
    follower_count: int = 0
    following_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}
