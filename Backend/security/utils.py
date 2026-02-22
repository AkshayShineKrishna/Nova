from datetime import datetime, timezone, timedelta

from fastapi import HTTPException, status
from jose import jwt, JWTError, ExpiredSignatureError
from passlib.context import CryptContext

from core import Settings

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def hash_password(plain_text: str) -> str:
    return pwd_context.hash(plain_text)


def verify_password(plain_text: str, hashed_pwd: str) -> bool:
    return pwd_context.verify(plain_text, hashed_pwd)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    created_time = datetime.now(timezone.utc)
    expire = created_time + timedelta(minutes=float(Settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "iat": created_time, "type": "access"})
    return jwt.encode(claims=to_encode, key=Settings.ACCESS_SECRET_KEY, algorithm=Settings.ALGORITHM)


def verify_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, Settings.ACCESS_SECRET_KEY, algorithms=[Settings.ALGORITHM])
        return payload
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="token_expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    created_time = datetime.now(timezone.utc)
    expire = created_time + timedelta(minutes=float(Settings.REFRESH_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "iat": created_time, "type": "refresh"})
    return jwt.encode(claims=to_encode, key=Settings.REFRESH_SECRET_KEY, algorithm=Settings.ALGORITHM)


def verify_refresh_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, Settings.REFRESH_SECRET_KEY, algorithms=[Settings.ALGORITHM])
        return payload
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="token_expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
