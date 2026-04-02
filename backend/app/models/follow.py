from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.db.session import Base


class Follow(Base):
    __tablename__ = "follows"

    follower_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), primary_key=True)
    following_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
