from openai import AsyncOpenAI
from ..config import settings

oai = AsyncOpenAI(api_key=settings.openai_api_key)


async def embed_batch(texts: list[str]) -> list[list[float]]:
    out: list[list[float]] = []
    B = 96
    for i in range(0, len(texts), B):
        r = await oai.embeddings.create(model=settings.embed_model, input=texts[i:i + B])
        out.extend([d.embedding for d in r.data])
    return out
