import uuid
from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..models import Chunk
from .embeddings import embed_batch

oai = AsyncOpenAI(api_key=settings.openai_api_key)

SYSTEM = (
    "You are Mindora, a study assistant. Answer ONLY using the provided context. "
    "If the answer is not in the context, say so clearly. "
    "Cite sources inline like [1], [2] matching the numbered context blocks."
)


async def retrieve(s: AsyncSession, user_id: str, question: str, document_ids: list[str] | None, k: int = 6):
    qvec = (await embed_batch([question]))[0]
    uid = uuid.UUID(user_id)

    # pgvector cosine distance: smaller = closer. Use <=> operator.
    distance = Chunk.embedding.cosine_distance(qvec).label("distance")
    stmt = select(Chunk, distance).where(Chunk.user_id == uid)
    if document_ids:
        stmt = stmt.where(Chunk.document_id.in_([uuid.UUID(d) for d in document_ids]))
    stmt = stmt.order_by(distance).limit(k)

    rows = (await s.execute(stmt)).all()
    return [{
        "text": c.text,
        "filename": c.filename,
        "page": c.page,
        "documentId": str(c.document_id),
        "score": float(1 - dist),  # cosine similarity
    } for c, dist in rows]


async def answer(s: AsyncSession, user_id: str, question: str, document_ids: list[str] | None):
    chunks = await retrieve(s, user_id, question, document_ids)
    if not chunks:
        return {
            "content": "I couldn't find anything in your uploaded materials about that. "
                       "Try uploading relevant notes first.",
            "citations": [],
        }

    context = "\n\n".join(
        f"[{i+1}] ({c['filename']} p.{c.get('page', '?')}) {c['text']}"
        for i, c in enumerate(chunks)
    )
    res = await oai.chat.completions.create(
        model=settings.llm_model,
        temperature=0.2,
        messages=[
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}"},
        ],
    )
    return {
        "content": res.choices[0].message.content,
        "citations": [
            {
                "documentId": c["documentId"],
                "filename": c["filename"],
                "page": c.get("page"),
                "snippet": c["text"][:240],
                "score": c.get("score"),
            }
            for c in chunks
        ],
    }
