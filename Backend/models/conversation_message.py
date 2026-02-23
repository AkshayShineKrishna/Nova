"""
ConversationMessage — a single message within a ConversationSession.
Uses MessageRole enum (HUMAN / ASSISTANT) instead of a raw string.
"""
import enum
from datetime import datetime, timezone

import uuid6
from sqlalchemy import String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core import Base


class MessageRole(enum.Enum):
    HUMAN = "human"
    ASSISTANT = "assistant"


class ConversationMessage(Base):
    __tablename__ = "conversation_messages"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid6.uuid7())
    )
    session_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("conversation_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    role: Mapped[MessageRole] = mapped_column(
        Enum(MessageRole),
        nullable=False
    )
    content: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc)
    )

    session: Mapped["ConversationSession"] = relationship(  # noqa: F821
        "ConversationSession",
        back_populates="messages",
        lazy="noload"
    )
