from dataclasses import dataclass

from fastapi import APIRouter, Depends, HTTPException, Request
from starlette import status
from firebase_admin import auth
from firebase_config import *

from project.models.db.user import UserPublic
from project.sql.users import get_user

router = APIRouter()


@dataclass(frozen=True)
class FirebaseIdentity:
    email: str
    name: str


def _bearer_token(request: Request) -> str:
    authorization = request.headers.get("Authorization")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header",
        )
    return authorization.split("Bearer ", 1)[1]


async def firebase_identity(request: Request) -> FirebaseIdentity:
    """Verify the Firebase token. Does not require a row in users."""
    id_token = _bearer_token(request)
    try:
        decoded_token = auth.verify_id_token(id_token)
    except Exception as e:
        print(f"Token Verification Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired ID token",
        ) from e

    email = decoded_token.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This account has no email address",
        )
    name = decoded_token.get("name") or str(email).split("@", 1)[0]
    return FirebaseIdentity(email=str(email), name=str(name))


async def firebase_user_authenticated(request: Request) -> UserPublic:
    identity = await firebase_identity(request)
    user = await get_user(email=identity.email)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return UserPublic.model_validate(user.model_dump())


async def firebase_user_optional(request: Request) -> UserPublic | None:
    """Return the user when a valid Bearer token is present; otherwise None."""
    authorization = request.headers.get("Authorization")
    if not authorization or not authorization.startswith("Bearer "):
        return None
    return await firebase_user_authenticated(request)


@router.get("/protected")
async def protected_route(user: UserPublic = Depends(firebase_user_authenticated)):
    return {"message": "You are authorized!", "user": user}
