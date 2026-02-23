import enum
from datetime import datetime, timezone

import uuid6
from sqlalchemy import String, Text, Enum, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core import Base


class Roles(enum.Enum):
    ADMIN = "admin"
    USER = "user"


class Users(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid6.uuid7())
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False
    )
    password: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )
    role: Mapped[Roles] = mapped_column(
        Enum(Roles),
        nullable=False,
        default=Roles.USER
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc)
    )

    refresh_tokens: Mapped[list["RefreshTokens"]] = relationship(
        "RefreshTokens",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin"
    )

    conversation_sessions: Mapped[list["ConversationSession"]] = relationship(  # noqa: F821
        "ConversationSession",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="noload",
        order_by="ConversationSession.created_at"
    )
