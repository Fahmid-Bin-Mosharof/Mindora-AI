from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..deps import current_user
from ..models import User
from .auth import s_user

router = APIRouter(prefix="/users", tags=["users"])


class ProfilePatch(BaseModel):
    name: Optional[str] = None
    language: Optional[str] = None


@router.patch("/me")
async def update_me(
    body: ProfilePatch,
    user: User = Depends(current_user),
    s: AsyncSession = Depends(get_session),
):
    if body.name is not None:
        user.name = body.name
    if body.language is not None:
        user.language = body.language
    s.add(user)
    await s.commit()
    await s.refresh(user)
    return {"user": s_user(user)}
