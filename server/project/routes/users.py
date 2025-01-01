from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from heliclockter import datetime_utc
from starlette import status

from project.config import config
from project.logic.subscriptions import setup_demo_account
from project.models.db.account import UserAccountType
from project.models.db.user import (
    DemoUserToRegister,
    UserInsertable,
    UserPasswordToUpdate,
    UserPublic,
    UserToRegister,
    UserToUpdate,
)
from project.routes.auth import firebase_user_authenticated
from project.routes.models import SuccessResponse, UserPublicResponse
from project.sql.users import (
    check_whether_email_is_in_use,
    create_user,
    get_user_by_id,
    update_user,
    update_user_password,
)
from project.utils.id_types import UserId
from project.utils.security import hash_password, verify_captcha_token
from project.utils.types import assert_some

router = APIRouter()


@router.get("/users/{user_id}", response_model=UserPublicResponse)
async def get_me(
    user_id: UserId, user_public: UserPublic = Depends(firebase_user_authenticated)
) -> UserPublicResponse:
    if user_public.id != user_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Can't view details of this user")

    return UserPublicResponse(data=user_public)


@router.put("/users/{user_id}", response_model=UserPublicResponse)
async def update_user_details(
    user_id: UserId,
    user_to_update: UserToUpdate,
    user_public: UserPublic = Depends(firebase_user_authenticated),
) -> UserPublicResponse:
    if user_public.id != user_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Can't change details of this user")

    await update_user(user_public.id, user_to_update)
    user_updated = await get_user_by_id(user_id)
    return UserPublicResponse(data=assert_some(user_updated))


@router.put("/users/{user_id}/password", response_model=SuccessResponse)
async def put_user_password(
    user_id: UserId,
    user_to_update: UserPasswordToUpdate,
    user_public: UserPublic = Depends(firebase_user_authenticated),
) -> SuccessResponse:
    assert user_public.id == user_id
    await update_user_password(user_public.id, hash_password(user_to_update.password))
    return SuccessResponse()


@router.post("/users/register", response_model=SuccessResponse)
async def register_user(user_to_register: UserToRegister) -> SuccessResponse:
    if not config.allow_user_registration:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Account creation is unavailable for now")

    if not await verify_captcha_token(user_to_register.captcha_token):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Failed to validate captcha")

    user = UserInsertable(
        email=user_to_register.email,
        password_hash=hash_password(user_to_register.password),
        name=user_to_register.name,
        created=datetime_utc.now(),
        account_type=UserAccountType.REGULAR,
    )
    if await check_whether_email_is_in_use(user.email):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email address already in use")

    user_created = await create_user(user)
    return SuccessResponse()


@router.post("/users/register_demo", response_model=SuccessResponse)
async def register_demo_user(user_to_register: DemoUserToRegister) -> SuccessResponse:
    if not config.allow_demo_user_registration:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "Demo account creation is unavailable for now"
        )

    if not await verify_captcha_token(user_to_register.captcha_token):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Failed to validate captcha")

    username = f"demo-{uuid4()}"
    user = UserInsertable(
        email=f"{username}@example.org",
        password_hash=hash_password(str(uuid4())),
        name=username,
        created=datetime_utc.now(),
        account_type=UserAccountType.DEMO,
    )
    if await check_whether_email_is_in_use(user.email):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email address already in use")

    user_created = await create_user(user)
    await setup_demo_account(user_created.id)
    return SuccessResponse()
