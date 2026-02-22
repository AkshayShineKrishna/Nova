import hashlib

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from models import RefreshTokens


class RefreshTokensRepository:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def register_token(self, user_id: str, token: str):
        hashed_token = hashlib.sha256(token.encode()).hexdigest()
        refresh_token = RefreshTokens(
            user_id=user_id,
            token=hashed_token
        )
        self.db.add(refresh_token)
        await self.db.flush()

    async def get_by_token_hash(self, token: str) -> RefreshTokens | None:
        """Look up a stored refresh token by its raw value (hashes internally)."""
        hashed = hashlib.sha256(token.encode()).hexdigest()
        result = await self.db.execute(
            select(RefreshTokens).where(RefreshTokens.token == hashed)
        )
        return result.scalar_one_or_none()

    async def revoke_token(self, token_id: str) -> None:
        """Mark a specific token as revoked (used). Preserves the row for reuse detection."""
        await self.db.execute(
            update(RefreshTokens)
            .where(RefreshTokens.token_id == token_id)
            .values(revoked=True)
        )
        await self.db.flush()

    async def delete_all_for_user(self, user_id: str):
        await self.db.execute(delete(RefreshTokens).where(RefreshTokens.user_id == user_id))
        await self.db.flush()

