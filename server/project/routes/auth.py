from fastapi import APIRouter, Depends
from starlette import status
from fastapi import HTTPException, Request
from firebase_admin import auth
from firebase_config import *

from project.models.db.user import UserInDB, UserPublic
from project.sql.users import get_user, get_user_access_to_club, get_user_access_to_tournament
from project.utils.types import assert_some

router = APIRouter()

async def firebase_user_authenticated(request: Request):

    # Extract Authorization header
    authorization = request.headers.get("Authorization")

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header",
        )
    
    # Extract token
    id_token = authorization.split("Bearer ")[1]

    try:
        # Verify Firebase ID token
        decoded_token = auth.verify_id_token(id_token)
        user = await get_user(email=assert_some(decoded_token.get("email")))
        if user is None:
            return None
        return UserPublic.model_validate(user.model_dump())
        # uid = decoded_token.get("uid")
        # email = decoded_token.get("email")
        # return {"uid": uid, "email": email}
    except Exception as e:
        print(f"Token Verification Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired ID token",
        )

@router.get("/protected")
async def protected_route(user: dict = Depends(firebase_user_authenticated)):
    return {"message": "You are authorized!", "user": user}
