from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.ext.asyncio import AsyncSession

from core import get_async_session, Settings
from exceptions import UserAlreadyExistsException, InvalidCredentialsException
from models import Users
from repository import UserRepository
from repository.refresh_tokens_repository import RefreshTokensRepository
from schema import CreateUser, ReadUser
from security.filter import get_current_user
from services.auth_services import AuthServices

auth_route = APIRouter(prefix="/auth", tags=["Auth"])


def get_auth_service(
        session: AsyncSession = Depends(get_async_session),
):
    user_repo = UserRepository(session)
    refresh_repo = RefreshTokensRepository(session)
    return AuthServices(user_repo=user_repo, refresh_repo=refresh_repo)


@auth_route.post("/register", status_code=status.HTTP_201_CREATED)
async def register_user(response: Response, data: CreateUser, service: AuthServices = Depends(get_auth_service)):
    try:
        await service.create_user(data)
        # Immediately log the new user in by issuing tokens
        tokens = await service.login_user(data)
        response.set_cookie(
            key="access_token",
            value=tokens["access_token"],
            httponly=True,
            secure=False,
            samesite="lax",
            max_age=Settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
        response.set_cookie(
            key="refresh_token",
            value=tokens["refresh_token"],
            httponly=True,
            secure=False,
            samesite="lax",
            max_age=Settings.REFRESH_TOKEN_EXPIRE_MINUTES * 60
        )
        return {"message": "User Registered Successfully"}
    except UserAlreadyExistsException as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@auth_route.post("/login")
async def login_user(response: Response, data: CreateUser, service: AuthServices = Depends(get_auth_service)):
    try:
        tokens = await service.login_user(data)
        response.set_cookie(
            key="access_token",
            value=tokens["access_token"],
            httponly=True,
            secure=False,
            samesite="lax",
            max_age=Settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
        response.set_cookie(
            key="refresh_token",
            value=tokens["refresh_token"],
            httponly=True,
            secure=False,
            samesite="lax",
            max_age=Settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
        return {"message": "Login successful"}
    except InvalidCredentialsException as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@auth_route.get("/me", response_model=ReadUser)
async def get_me(current_user: Users = Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    return current_user


@auth_route.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
        response: Response,
        current_user: Users = Depends(get_current_user),
        service: AuthServices = Depends(get_auth_service),
):
    """Revoke all server-side refresh tokens and clear auth cookies."""
    await service.logout_user(current_user.id)
    response.delete_cookie(key="access_token", httponly=True, samesite="lax")
    response.delete_cookie(key="refresh_token", httponly=True, samesite="lax")


@auth_route.post("/refresh")
async def refresh(
        request: Request,
        response: Response,
        service: AuthServices = Depends(get_auth_service),
):
    """Rotate refresh token and issue a fresh access token.

    Uses refresh token rotation with reuse detection:
    - Valid token -> new access + refresh tokens issued, old token revoked.
    - Revoked (replayed) token -> ALL sessions wiped, 401 returned.
    """
    raw_token: str | None = request.cookies.get("refresh_token")
    if raw_token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
        )

    tokens = await service.refresh_tokens(raw_token)

    response.set_cookie(
        key="access_token",
        value=tokens["access_token"],
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=Settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    response.set_cookie(
        key="refresh_token",
        value=tokens["refresh_token"],
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=Settings.REFRESH_TOKEN_EXPIRE_MINUTES * 60,
    )
    return {"message": "Tokens refreshed"}
