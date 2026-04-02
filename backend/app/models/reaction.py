import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Enum, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base


class ReactionType(str, enum.Enum):
    KEEP_GOING = "KEEP_GOING"      # 継続すごい
    NICE_EFFORT = "NICE_EFFORT"    # ナイス努力
    INSPIRED = "INSPIRED"          # 刺激もらった


class Reaction(Base):
    __tablename__ = "reactions"
    __table_args__ = (UniqueConstraint("user_id", "post_id", name="uq_reaction_user_post"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    post_id: Mapped[str] = mapped_column(String, ForeignKey("posts.id"), nullable=False)
    type: Mapped[ReactionType] = mapped_column(Enum(ReactionType), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    user: Mapped["User"] = relationship("User", back_populates="reactions")
    post: Mapped["Post"] = relationship("Post", back_populates="reactions")
