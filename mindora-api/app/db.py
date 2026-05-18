from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy import text

from .config import settings
from .models import Base

engine = create_async_engine(settings.database_url, pool_pre_ping=True, future=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as s:
        yield s


async def init_db() -> None:
    """Enable pgvector and create tables/indexes on first startup."""
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(Base.metadata.create_all)
        # IVFFlat index for cosine similarity over chunks.embedding
        await conn.execute(text(
            "CREATE INDEX IF NOT EXISTS chunks_embedding_idx "
            "ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)"
        ))
