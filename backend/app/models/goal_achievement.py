import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
from app.db.session import Base


class GoalAchievement(Base):
    __tablename__ = "goal_achievements"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    goal_text: Mapped[str] = mapped_column(String(200), nullable=False)
    comment: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    proof_post_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("posts.id"), nullable=True)
    is_public: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    achieved_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    user: Mapped["User"] = relationship("User", back_populates="achievements")
    proof_post: Mapped[Optional["Post"]] = relationship("Post")
