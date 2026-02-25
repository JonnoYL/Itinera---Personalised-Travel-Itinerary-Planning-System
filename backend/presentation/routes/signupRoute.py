from application.models.authModels import AuthRequest
from database.setup import get_db
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from application.user_service import UserService
from persistence.user_repository import UserRepository
from application.models.user import AuthResponse


load_dotenv()

router = APIRouter(
    prefix="/auth",
    tags=["Sign Up"],
)

@router.post(
    "/signup",
    response_model=AuthResponse,
    responses={
        400: {"description": "Username already exists"},
        422: {"description": "Validation Error"},
    },
)

async def signup(request: AuthRequest, db: Session = Depends(get_db)):
    # Blank or whitespace-only username -> 422 Validation Error
    if not request.username or not request.username.strip():
        raise HTTPException(
            status_code=422,
            detail=[
                {
                    "loc": ["body", "username"],
                    "msg": "Invalid Username",
                    "type": "value_error",
                }
            ],
        )

    user_repo = UserRepository(db)
    service = UserService(user_repo)
    return service.signup(request)
