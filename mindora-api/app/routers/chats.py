import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..deps import current_user
from ..models import Session as ChatSession, Message, User
from ..services.rag import answer

router = APIRouter(prefix="/chats", tags=["chats"])


class CreateIn(BaseModel):
    title: Optional[str] = None
    documentIds: List[str] = []


class RenameIn(BaseModel):
    title: str


class AskIn(BaseModel):
    question: str
    documentIds: Optional[List[str]] = None


def s_session(x: ChatSession):
    return {
        "id": str(x.id),
        "title": x.title,
        "documentIds": list(x.document_ids or []),
        "createdAt": x.created_at.isoformat(),
        "updatedAt": x.updated_at.isoformat(),
        "lastMessagePreview": x.last_message_preview,
    }


def s_message(m: Message):
    return {
        "id": str(m.id),
        "sessionId": str(m.session_id),
        "role": m.role,
        "content": m.content,
        "citations": m.citations or [],
        "createdAt": m.created_at.isoformat(),
    }


@router.get("")
async def list_sessions(user: User = Depends(current_user), s: AsyncSession = Depends(get_session)):
    rows = await s.scalars(
        select(ChatSession).where(ChatSession.user_id == user.id).order_by(ChatSession.updated_at.desc())
    )
    return [s_session(x) for x in rows.all()]


@router.post("")
async def create(body: CreateIn, user: User = Depends(current_user), s: AsyncSession = Depends(get_session)):
    x = ChatSession(
        user_id=user.id,
        title=(body.title or "").strip() or "New conversation",
        document_ids=body.documentIds,
    )
    s.add(x)
    await s.commit()
    await s.refresh(x)
    return s_session(x)


@router.get("/{sid}")
async def get_session_route(sid: str, user: User = Depends(current_user), s: AsyncSession = Depends(get_session)):
    sid_u = uuid.UUID(sid)
    x = await s.get(ChatSession, sid_u)
    if not x or x.user_id != user.id:
        raise HTTPException(404, "Not found")
    msgs = (await s.scalars(
        select(Message).where(Message.session_id == sid_u).order_by(Message.created_at.asc())
    )).all()
    return {"session": s_session(x), "messages": [s_message(m) for m in msgs]}


@router.patch("/{sid}")
async def rename(sid: str, body: RenameIn, user: User = Depends(current_user), s: AsyncSession = Depends(get_session)):
    x = await s.get(ChatSession, uuid.UUID(sid))
    if not x or x.user_id != user.id:
        raise HTTPException(404, "Not found")
    x.title = body.title.strip() or "New conversation"
    x.updated_at = datetime.utcnow()
    await s.commit()
    await s.refresh(x)
    return s_session(x)


@router.delete("/{sid}")
async def delete_session(sid: str, user: User = Depends(current_user), s: AsyncSession = Depends(get_session)):
    sid_u = uuid.UUID(sid)
    await s.execute(delete(Message).where(Message.session_id == sid_u))
    await s.execute(delete(ChatSession).where(ChatSession.id == sid_u, ChatSession.user_id == user.id))
    await s.commit()
    return {"ok": True}


@router.post("/{sid}/ask")
async def ask(sid: str, body: AskIn, user: User = Depends(current_user), s: AsyncSession = Depends(get_session)):
    sid_u = uuid.UUID(sid)
    x = await s.get(ChatSession, sid_u)
    if not x or x.user_id != user.id:
        raise HTTPException(404, "Not found")

    s.add(Message(session_id=sid_u, role="user", content=body.question))

    doc_ids = body.documentIds or list(x.document_ids or [])
    out = await answer(s, str(user.id), body.question, doc_ids)

    m = Message(session_id=sid_u, role="assistant", content=out["content"], citations=out["citations"])
    s.add(m)

    x.updated_at = datetime.utcnow()
    x.last_message_preview = out["content"][:80]
    if x.title == "New conversation":
        x.title = body.question[:60]

    await s.commit()
    await s.refresh(m)
    return {"message": s_message(m)}
