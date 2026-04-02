import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base


class PostStatus(str, enum.Enum):
    NOT_POSTED = "NOT_POSTED"
    POSTED = "POSTED"
    LATE = "LATE"
    MISSED = "MISSED"


class Post(Base):
    __tablename__ = "posts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    image_url: Mapped[str] = mapped_column(String, nullable=False)
    text: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[PostStatus] = mapped_column(
        Enum(PostStatus), default=PostStatus.POSTED, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    user: Mapped["User"] = relationship("User", back_populates="posts")
    reactions: Mapped[list["Reaction"]] = relationship("Reaction", back_populates="post")
    comments: Mapped[list["Comment"]] = relationship(
        "Comment", back_populates="post", order_by="Comment.created_at"
    )
