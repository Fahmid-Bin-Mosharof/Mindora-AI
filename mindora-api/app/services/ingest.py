import io
import uuid
from pypdf import PdfReader
from sqlalchemy import update

from ..db import SessionLocal
from ..models import Document, Chunk
from .embeddings import embed_batch


def chunk_text(text: str, size: int = 800, overlap: int = 120) -> list[str]:
    out: list[str] = []
    i = 0
    while i < len(text):
        out.append(text[i:i + size])
        i += size - overlap
    return [c.strip() for c in out if c.strip()]


async def ingest_pdf(doc_id: str, user_id: str, raw: bytes, filename: str) -> None:
    did = uuid.UUID(doc_id)
    uid = uuid.UUID(user_id)
    try:
        reader = PdfReader(io.BytesIO(raw))
        all_chunks: list[str] = []
        meta: list[int] = []
        for page_num, page in enumerate(reader.pages, start=1):
            text = page.extract_text() or ""
            for c in chunk_text(text):
                all_chunks.append(c)
                meta.append(page_num)

        async with SessionLocal() as s:
            if all_chunks:
                vectors = await embed_batch(all_chunks)
                s.add_all([
                    Chunk(
                        user_id=uid,
                        document_id=did,
                        filename=filename,
                        page=meta[i],
                        text=all_chunks[i],
                        embedding=vectors[i],
                    )
                    for i in range(len(all_chunks))
                ])
            await s.execute(
                update(Document).where(Document.id == did).values(status="ready", pages=len(reader.pages))
            )
            await s.commit()
    except Exception as e:
        async with SessionLocal() as s:
            await s.execute(
                update(Document).where(Document.id == did).values(status="failed", error=str(e))
            )
            await s.commit()
