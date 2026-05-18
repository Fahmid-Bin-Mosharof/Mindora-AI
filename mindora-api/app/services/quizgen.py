import json
import uuid
from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..models import Chunk

oai = AsyncOpenAI(api_key=settings.openai_api_key)

PROMPT = """Generate a {n}-question multiple-choice quiz at {difficulty} difficulty
from the context below. Each question MUST have exactly 4 options and one correctIndex (0-3).
Return STRICT JSON in this exact shape:
{{"questions":[{{"question":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"..."}}]}}

Context:
{ctx}
"""


async def generate(s: AsyncSession, user_id: str, document_ids: list[str], n: int, difficulty: str):
    n = max(3, min(20, int(n)))
    uid = uuid.UUID(user_id)

    stmt = select(Chunk.text).where(Chunk.user_id == uid)
    if document_ids:
        stmt = stmt.where(Chunk.document_id.in_([uuid.UUID(d) for d in document_ids]))
    stmt = stmt.limit(40)

    rows = (await s.execute(stmt)).all()
    ctx = "\n---\n".join(r[0] for r in rows) or "No documents uploaded."

    res = await oai.chat.completions.create(
        model=settings.llm_model,
        temperature=0.4,
        response_format={"type": "json_object"},
        messages=[{
            "role": "user",
            "content": PROMPT.format(n=n, difficulty=difficulty, ctx=ctx[:12000]),
        }],
    )
    data = json.loads(res.choices[0].message.content)
    questions = data.get("questions", [])

    cleaned = []
    for q in questions:
        opts = q.get("options", [])
        if len(opts) != 4:
            continue
        cleaned.append({
            "question": q.get("question", "").strip(),
            "options": opts,
            "correctIndex": int(q.get("correctIndex", 0)) % 4,
            "explanation": q.get("explanation", ""),
        })
    return cleaned[:n]
