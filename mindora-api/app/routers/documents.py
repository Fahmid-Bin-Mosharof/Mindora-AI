import uuid
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..db import get_session
from ..deps import current_user
from ..models import Document, Chunk, User
from ..services.ingest import ingest_pdf

router = APIRouter(prefix="/documents", tags=["documents"])


def serialize(d: Document):
    return {
        "id": str(d.id),
        "filename": d.filename,
        "size": d.size,
        "mimeType": d.mime_type,
        "pages": d.pages,
        "status": d.status,
        "createdAt": d.created_at.isoformat(),
    }


@router.get("")
async def list_docs(user: User = Depends(current_user), s: AsyncSession = Depends(get_session)):
    rows = await s.scalars(
        select(Document).where(Document.user_id == user.id).order_by(Document.created_at.desc())
    )
    return [serialize(d) for d in rows.all()]


@router.post("/upload")
async def upload(
    bg: BackgroundTasks,
    file: UploadFile = File(...),
    user: User = Depends(current_user),
    s: AsyncSession = Depends(get_session),
):
    raw = await file.read()
    if len(raw) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(413, "File too large")
    d = Document(
        user_id=user.id,
        filename=file.filename,
        size=len(raw),
        mime_type=file.content_type or "application/octet-stream",
        status="processing",
    )
    s.add(d)
    await s.commit()
    await s.refresh(d)
    bg.add_task(ingest_pdf, str(d.id), str(user.id), raw, file.filename)
    return serialize(d)


@router.delete("/{doc_id}")
async def delete_doc(doc_id: str, user: User = Depends(current_user), s: AsyncSession = Depends(get_session)):
    did = uuid.UUID(doc_id)
    await s.execute(delete(Chunk).where(Chunk.document_id == did, Chunk.user_id == user.id))
    await s.execute(delete(Document).where(Document.id == did, Document.user_id == user.id))
    await s.commit()
    return {"ok": True}
