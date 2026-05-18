import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..deps import current_user
from ..models import Quiz, Attempt, User
from ..services.quizgen import generate

router = APIRouter(prefix="/quizzes", tags=["quizzes"])


class GenIn(BaseModel):
    title: Optional[str] = None
    documentIds: List[str] = []
    numQuestions: int = 5
    difficulty: str = "medium"


class AttemptIn(BaseModel):
    answers: List[int]
    durationSec: int


def s_quiz(q: Quiz):
    return {
        "id": str(q.id),
        "title": q.title,
        "documentIds": list(q.document_ids or []),
        "difficulty": q.difficulty,
        "questions": q.questions,
        "createdAt": q.created_at.isoformat(),
    }


@router.post("/generate")
async def gen(body: GenIn, user: User = Depends(current_user), s: AsyncSession = Depends(get_session)):
    qs = await generate(s, str(user.id), body.documentIds, body.numQuestions, body.difficulty)
    for q in qs:
        q["id"] = str(uuid.uuid4())
    quiz = Quiz(
        user_id=user.id,
        title=(body.title or "").strip() or "Generated quiz",
        document_ids=body.documentIds,
        difficulty=body.difficulty,
        questions=qs,
    )
    s.add(quiz)
    await s.commit()
    await s.refresh(quiz)
    return s_quiz(quiz)


@router.get("")
async def list_q(user: User = Depends(current_user), s: AsyncSession = Depends(get_session)):
    rows = await s.scalars(select(Quiz).where(Quiz.user_id == user.id).order_by(Quiz.created_at.desc()))
    return [s_quiz(q) for q in rows.all()]


@router.get("/{qid}")
async def get_q(qid: str, user: User = Depends(current_user), s: AsyncSession = Depends(get_session)):
    q = await s.get(Quiz, uuid.UUID(qid))
    if not q or q.user_id != user.id:
        raise HTTPException(404, "Not found")
    return s_quiz(q)


@router.delete("/{qid}")
async def delete_q(qid: str, user: User = Depends(current_user), s: AsyncSession = Depends(get_session)):
    await s.execute(delete(Quiz).where(Quiz.id == uuid.UUID(qid), Quiz.user_id == user.id))
    await s.commit()
    return {"ok": True}


@router.post("/{qid}/attempts")
async def attempt(qid: str, body: AttemptIn, user: User = Depends(current_user), s: AsyncSession = Depends(get_session)):
    q = await s.get(Quiz, uuid.UUID(qid))
    if not q or q.user_id != user.id:
        raise HTTPException(404, "Not found")
    correct = sum(
        1 for i, qq in enumerate(q.questions)
        if i < len(body.answers) and body.answers[i] == qq["correctIndex"]
    )
    total = len(q.questions) or 1
    a = Attempt(
        user_id=user.id,
        quiz_id=q.id,
        quiz_title=q.title,
        score=round(correct * 100 / total),
        correct=correct,
        total=total,
        answers=body.answers,
        duration_sec=body.durationSec,
    )
    s.add(a)
    await s.commit()
    await s.refresh(a)
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
