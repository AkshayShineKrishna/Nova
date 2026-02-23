"""
ConversationSession — top-level container for a named conversation.
Each user can have many sessions (e.g. "Math Help", "Python Jokes").
"""
from datetime import datetime, timezone

import uuid6
from sqlalchemy import String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core import Base


class ConversationSession(Base):
    __tablename__ = "conversation_sessions"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid6.uuid7())
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    # LLM-generated short title for the conversation
    name: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        default=None
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc)
    )

    user: Mapped["Users"] = relationship(   # noqa: F821
        "Users",
        back_populates="conversation_sessions",
        lazy="noload"
    )
    messages: Mapped[list["ConversationMessage"]] = relationship(  # noqa: F821
        "ConversationMessage",
        back_populates="session",
        cascade="all, delete-orphan",
        lazy="noload",
        order_by="ConversationMessage.created_at"
    )
