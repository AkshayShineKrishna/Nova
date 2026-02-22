from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from core.settings import Settings

DATABASE_URL = f"mysql+aiomysql://{Settings.USER}:{Settings.PASSWORD}@{Settings.HOST}:{Settings.PORT}/{Settings.DATABASE}"
engine = create_async_engine(url=DATABASE_URL, echo=False)
async_session_maker = async_sessionmaker(bind=engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_async_session():
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except:
            await session.rollback()
            raise
