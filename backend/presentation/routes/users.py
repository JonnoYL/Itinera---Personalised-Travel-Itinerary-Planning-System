from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database.setup import get_db
from application.user_service import UserService
from application.models.user import UserResponse
from persistence.user_repository import UserRepository


router = APIRouter(
    prefix="/users",
    tags=["Users"],
)

@router.get(
    "/{user_id}",
    response_model=UserResponse,
    responses={
        404: {"description": "User not found"}
    }
)
def get_user_by_id(user_id: int, db: Session = Depends(get_db)):
    """Returns specific user by id"""
    user_repo = UserRepository(db)
    service = UserService(user_repo)
    return service.get_user_by_id(user_id)
