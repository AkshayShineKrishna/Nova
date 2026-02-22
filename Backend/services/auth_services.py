from exceptions import UserAlreadyExistsException, InvalidCredentialsException
from models import Users
from repository import UserRepository
from repository.refresh_tokens_repository import RefreshTokensRepository
from schema import CreateUser
from security import hash_password, verify_password, create_access_token, create_refresh_token, verify_refresh_token
from fastapi import HTTPException, status
import logging

logger = logging.getLogger(__name__)


class AuthServices:

    def __init__(self, user_repo: UserRepository, refresh_repo: RefreshTokensRepository):
        self.user_repo = user_repo
        self.refresh_repo = refresh_repo

    async def create_user(self, user: CreateUser) -> Users:
        existing_user = await self.user_repo.get_user_by_email(str(user.email))

        if existing_user is not None:
            raise UserAlreadyExistsException("Email already in use")

        new_user = Users(
            email=user.email,
            password=hash_password(user.password)
        )

        return await self.user_repo.create_user(new_user)

    async def login_user(self, user: CreateUser):
        existing_user = await self.user_repo.get_user_by_email(str(user.email))
        if existing_user is None or not verify_password(plain_text=user.password, hashed_pwd=existing_user.password):
            raise InvalidCredentialsException(
                "Invalid email or password"
            )
        payload = {"sub": existing_user.id}
        access_token = create_access_token(data=payload)
        refresh_token = create_refresh_token(data=payload)
        logger.info("Issuing new tokens for user_id=%s", existing_user.id)
        await self.refresh_repo.register_token(user_id=existing_user.id, token=refresh_token)
        return {
            "access_token": access_token,
            "refresh_token": refresh_token
        }

    async def refresh_tokens(self, raw_refresh_token: str) -> dict:
        # 1. Verify JWT signature and expiry
        payload = verify_refresh_token(raw_refresh_token)
        user_id: str = payload.get("sub")

        # 2. Look up in the DB
        stored = await self.refresh_repo.get_by_token_hash(raw_refresh_token)

        if stored is None:
            # Token not in DB at all — tampered or already wiped
            logger.warning("Refresh token not found in DB for user_id=%s — rejecting", user_id)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )

        if stored.revoked:
            # ⚠️ REUSE DETECTED: a previously-rotated token was replayed
            # This means either the user or an attacker has an old token.
            # Safe response: nuke ALL sessions for this user immediately.
            logger.warning(
                "REUSE DETECTED — revoked refresh token replayed for user_id=%s. "
                "Revoking all sessions.", stored.user_id
            )
            await self.refresh_repo.delete_all_for_user(stored.user_id)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token reuse detected. All sessions revoked. Please log in again.",
            )

        # 3. Rotate: mark old token revoked, issue new pair
        await self.refresh_repo.revoke_token(stored.token_id)
        new_access_token = create_access_token(data={"sub": stored.user_id})
        new_refresh_token = create_refresh_token(data={"sub": stored.user_id})
        logger.info("Rotating tokens for user_id=%s", stored.user_id)
        await self.refresh_repo.register_token(user_id=stored.user_id, token=new_refresh_token)

        return {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
        }

    async def logout_user(self, user_id: str) -> None:
        """Revoke all server-side refresh tokens for the user."""
        await self.refresh_repo.delete_all_for_user(user_id)

