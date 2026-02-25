from application.models.authModels import AuthRequest
from database.setup import get_db
from dotenv import load_dotenv
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from application.user_service import UserService
from persistence.user_repository import UserRepository
from application.models.user import AuthResponse


load_dotenv()

router = APIRouter(
    prefix="/auth",
    tags=["Login"],
)

@router.post(
    "/login",
    responses={
        400: {"description": "Incorrect username or password"},
    },
    response_model=AuthResponse,
)

async def login(request: AuthRequest, db: Session = Depends(get_db)):
    user_repo = UserRepository(db)
    service = UserService(user_repo)
    return service.login(request)
