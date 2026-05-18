import uuid
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from .db import get_session
from .models import User
from .security import decode_token

bearer = HTTPBearer(auto_error=True)


async def current_user(
    cred: HTTPAuthorizationCredentials = Depends(bearer),
    s: AsyncSession = Depends(get_session),
) -> User:
    try:
        uid = uuid.UUID(decode_token(cred.credentials))
    except Exception:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    user = await s.get(User, uid)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    return user
