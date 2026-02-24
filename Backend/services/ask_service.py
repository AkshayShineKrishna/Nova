import logging

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from graph import generate_conversation_title
from models import ConversationSession, ConversationMessage, MessageRole
from repository.conversation_repository import ConversationRepository

logger = logging.getLogger(__name__)


class AskService:

    def __init__(self, repo: ConversationRepository, db: AsyncSession):
        self.repo = repo
        self.db = db

    # ── Session helpers ───────────────────────────────────────────────────────

    async def get_or_create_session(
        self, user_id: str, session_id: str | None
    ) -> ConversationSession:
        """Return an existing session (owned by user) or create a new unnamed one."""
        if session_id:
            session = await self.repo.get_session(session_id, user_id)
            if session:
                return session
        return await self.repo.create_session(user_id)

    async def load_history(
        self, session_id: str, limit: int = 20
    ) -> list[dict]:
        """Return the last `limit` messages as plain dicts for the graph."""
        msgs = await self.repo.get_recent_messages(session_id, limit)
        return [{"role": m.role.value, "content": m.content} for m in msgs]

    async def save_turn(
        self, session_id: str, query: str, answer: str, source: str | None = None
    ) -> None:
        """Persist a human + assistant message pair, then commit."""
        await self.repo.add_message(session_id, MessageRole.HUMAN, query)
        await self.repo.add_message(session_id, MessageRole.ASSISTANT, answer, source=source)
        await self.db.commit()

    async def maybe_set_title(
        self, session: ConversationSession, query: str, answer: str
    ) -> None:
        """Generate and persist a title on the first turn (when still unnamed)."""
        if session.name is not None:
            return
        try:
            title = await generate_conversation_title(query, answer)
            await self.repo.set_session_name(session, title)
            await self.db.commit()
            await self.db.refresh(session)
        except Exception as exc:
            logger.warning("Title generation failed: %s", exc)

    # ── Session CRUD ──────────────────────────────────────────────────────────

    async def list_sessions(self, user_id: str) -> list[ConversationSession]:
        return await self.repo.list_sessions_for_user(user_id)

    async def get_session_messages(
        self, session_id: str, user_id: str
    ) -> list[ConversationMessage]:
        """Return all messages in a session, verifying ownership."""
        session = await self.repo.get_session(session_id, user_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found",
            )
        return await self.repo.get_all_messages(session_id)

    async def rename_session(self, session_id: str, user_id: str, new_name: str) -> ConversationSession:
        """Rename a session, verifying ownership."""
        session = await self.repo.get_session(session_id, user_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found",
            )
        await self.repo.set_session_name(session, new_name.strip())
        await self.db.commit()
        await self.db.refresh(session)
        return session

    async def delete_session(self, session_id: str, user_id: str) -> None:
        """Delete a session (and cascaded messages), verifying ownership."""
        session = await self.repo.get_session(session_id, user_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found",
            )
        await self.repo.delete_session(session)
        await self.db.commit()
