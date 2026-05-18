from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .db import init_db
from .routers import auth, users, documents, chats, quizzes, attempts


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await init_db()
    except Exception as e:
        print(f"[startup] init_db failed: {e}")
    yield


app = FastAPI(title="Mindora API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.allowed_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (auth.router, users.router, documents.router, chats.router, quizzes.router, attempts.router):
    app.include_router(r)


@app.get("/health")
def health():
    return {"ok": True}
