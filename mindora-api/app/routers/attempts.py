from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..deps import current_user
from ..models import Attempt, User

router = APIRouter(prefix="/attempts", tags=["attempts"])


def serialize(a: Attempt):
    return {
        "id": str(a.id),
        "quizId": str(a.quiz_id),
        "quizTitle": a.quiz_title,
        "score": a.score,
        "correct": a.correct,
        "total": a.total,
        "answers": a.answers,
        "durationSec": a.duration_sec,
        "createdAt": a.created_at.isoformat(),
    }


@router.get("")
async def list_attempts(user: User = Depends(current_user), s: AsyncSession = Depends(get_session)):
    rows = await s.scalars(select(Attempt).where(Attempt.user_id == user.id).order_by(Attempt.created_at.desc()))
    return [serialize(a) for a in rows.all()]
