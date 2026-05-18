from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..deps import current_user
from ..models import User
from ..security import hash_password, make_token, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


class SignupIn(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


def s_user(u: User):
    return {
        "id": str(u.id),
        "name": u.name,
        "email": u.email,
        "language": u.language,
        "createdAt": u.created_at.isoformat(),
    }


@router.post("/signup")
async def signup(body: SignupIn, s: AsyncSession = Depends(get_session)):
    exists = await s.scalar(select(User).where(User.email == body.email))
    if exists:
        raise HTTPException(400, "Email already registered")
    u = User(name=body.name, email=body.email, password=hash_password(body.password))
    s.add(u)
    await s.commit()
    await s.refresh(u)
    return {"token": make_token(u.id), "user": s_user(u)}


@router.post("/login")
async def login(body: LoginIn, s: AsyncSession = Depends(get_session)):
    u = await s.scalar(select(User).where(User.email == body.email))
    if not u or not verify_password(body.password, u.password):
        raise HTTPException(401, "Invalid email or password")
    return {"token": make_token(u.id), "user": s_user(u)}


@router.get("/me")
async def me(user: User = Depends(current_user)):
    return {"user": s_user(user)}
