from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import ConversationSession, ConversationMessage, MessageRole


class ConversationRepository:

    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Sessions ──────────────────────────────────────────────────────────────

    async def get_session(
        self, session_id: str, user_id: str
    ) -> ConversationSession | None:
        result = await self.db.execute(
            select(ConversationSession).where(
                ConversationSession.id == session_id,
                ConversationSession.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def create_session(self, user_id: str) -> ConversationSession:
        session = ConversationSession(user_id=user_id)
        self.db.add(session)
        await self.db.flush()   # populate session.id without committing
        return session

    async def set_session_name(
        self, session: ConversationSession, name: str
    ) -> None:
        session.name = name
        self.db.add(session)

    async def list_sessions_for_user(
        self, user_id: str
    ) -> list[ConversationSession]:
        result = await self.db.execute(
            select(ConversationSession)
            .where(ConversationSession.user_id == user_id)
            .order_by(ConversationSession.created_at.desc())
        )
        return list(result.scalars().all())

    async def delete_session(self, session: ConversationSession) -> None:
        await self.db.delete(session)

    # ── Messages ──────────────────────────────────────────────────────────────

    async def get_recent_messages(
        self, session_id: str, limit: int = 20
    ) -> list[ConversationMessage]:
        """Return the last `limit` messages ordered newest-first, then reversed."""
        result = await self.db.execute(
            select(ConversationMessage)
            .where(ConversationMessage.session_id == session_id)
            .order_by(ConversationMessage.created_at.desc())
            .limit(limit)
        )
        rows = result.scalars().all()
        return list(reversed(rows))

    async def get_all_messages(
        self, session_id: str
    ) -> list[ConversationMessage]:
        result = await self.db.execute(
            select(ConversationMessage)
            .where(ConversationMessage.session_id == session_id)
            .order_by(ConversationMessage.created_at)
        )
        return list(result.scalars().all())

    async def add_message(
        self, session_id: str, role: MessageRole, content: str
    ) -> None:
        self.db.add(ConversationMessage(
            session_id=session_id,
            role=role,
            content=content,
        ))
