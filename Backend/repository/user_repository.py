from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import Users


class UserRepository:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_by_email(self, email: str) -> Users | None:
        result = await self.db.execute(
            select(Users).where(Users.email == email)
        )
        return result.scalar_one_or_none()

    async def create_user(self, user: Users) -> Users:
        self.db.add(user)
        await self.db.flush()
        return user
