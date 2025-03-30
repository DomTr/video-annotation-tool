# src/routers/users.py

from fastapi import APIRouter, Depends

from ..schemas import user
from ..dependencies import get_current_user

router = APIRouter(
    prefix="/users",
    tags=["users"],
)


@router.get("/me", response_model=user.UserRead)
def read_users_me(current_user: user.UserRead = Depends(get_current_user)):
    return current_user
