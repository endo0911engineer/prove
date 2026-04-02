import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, JSON, Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hashed_password: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    google_id: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True)
    is_onboarding_complete: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    goal: Mapped[str] = mapped_column(String(200), nullable=False, default="", server_default="")
    bio: Mapped[str | None] = mapped_column(String(100), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String, nullable=True)
    avatar_emoji: Mapped[str] = mapped_column(String(10), nullable=False, default="🔥", server_default="🔥")
    tags: Mapped[list] = mapped_column(JSON, nullable=False, default=list, server_default="[]")
    notification_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    posting_window_start: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    posting_window_end: Mapped[int] = mapped_column(Integer, nullable=False, default=23, server_default="23")
    is_private: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    current_streak: Mapped[int] = mapped_column(default=0)
    max_streak: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    posts: Mapped[list["Post"]] = relationship("Post", back_populates="user")
    reactions: Mapped[list["Reaction"]] = relationship("Reaction", back_populates="user")
    achievements: Mapped[list["GoalAchievement"]] = relationship("GoalAchievement", back_populates="user", order_by="GoalAchievement.achieved_at.desc()")
