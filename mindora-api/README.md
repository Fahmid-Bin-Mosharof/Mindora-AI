# Mindora API (FastAPI + PostgreSQL + pgvector)

Production backend for the Mindora frontend. RAG-powered doubt solving and quiz generation over a user's own PDFs, using **PostgreSQL + pgvector** for vector search and OpenAI for embeddings/LLM.

## Stack

- **FastAPI** + **Uvicorn**
- **SQLAlchemy 2.0 (async)** + **asyncpg**
- **PostgreSQL 15+** with **pgvector** extension
- **Alembic** for migrations (optional — auto `create_all` runs on startup too)
- **OpenAI** for embeddings (`text-embedding-3-small`, 1536-d) and chat (`gpt-4o-mini`)
- JWT auth (HS256) + bcrypt passwords

## Quick start (local)

```bash
# 1. Postgres with pgvector (Docker)
docker run -d --name mindora-pg -p 5432:5432 \
  -e POSTGRES_PASSWORD=mindora -e POSTGRES_DB=mindora \
  pgvector/pgvector:pg16

# 2. Backend
cd mindora-api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill DATABASE_URL, JWT_SECRET, OPENAI_API_KEY
uvicorn app.main:app --reload --port 8000
```

- Health: <http://localhost:8000/health>
- Docs:   <http://localhost:8000/docs>

Then point the frontend at it:

```bash
# in the React project root
echo 'VITE_API_URL=http://localhost:8000' > .env.local
bun dev
```

## Database — what happens on startup

`app.db.init_db()` runs once and:

1. `CREATE EXTENSION IF NOT EXISTS vector;`
2. Creates all tables from SQLAlchemy models.
3. Creates an **IVFFlat cosine index** on `chunks.embedding` (lists=100).

For production you should switch to **Alembic migrations**:

```bash
alembic init -t async migrations
# then edit env.py to use settings.database_url and Base.metadata
alembic revision --autogenerate -m "init"
alembic upgrade head
```

## Hosting options for Postgres

| Provider | Free tier | pgvector? |
|---|---|---|
| **Neon** | Yes (0.5 GB) | ✅ built-in |
| **Supabase** | Yes (500 MB) | ✅ built-in |
| **Railway** | Trial credit | ✅ via extension |
| Render Postgres | Limited | ✅ via extension |

Just create a database, enable the `vector` extension, and copy the connection string into `DATABASE_URL` (use the `postgresql+asyncpg://` prefix).

## Deploy backend (Render — recommended)

1. Push this folder to its own GitHub repo.
2. Render → **New → Web Service** → connect repo.
3. Runtime: **Docker** (uses included `Dockerfile`).
4. Add env vars from `.env.example` (real values).
5. Set frontend `VITE_API_URL` to the Render URL and redeploy.

## Routes (matches `src/lib/api.ts`)

| Method | Path |
|---|---|
| POST | `/auth/signup`, `/auth/login` |
| GET  | `/auth/me` |
| PATCH| `/users/me` |
| GET/POST/DELETE | `/documents`, `/documents/upload`, `/documents/{id}` |
| GET/POST | `/chats` |
| GET/PATCH/DELETE | `/chats/{id}` |
| POST | `/chats/{id}/ask` |
| POST/GET/DELETE | `/quizzes/generate`, `/quizzes`, `/quizzes/{id}` |
| POST | `/quizzes/{id}/attempts` |
| GET  | `/attempts` |
