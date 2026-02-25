from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer
from database.setup import get_db
from persistence.user_repository import UserRepository
import jwt
import os


JWT_SECRET = os.getenv("JWT_SECRET")
ALGORITHM = "HS256"
security = HTTPBearer()

def get_user_repo(db=Depends(get_db)):
    return UserRepository(db)

def get_current_user(
    credentials = Depends(security),
    user_repo: UserRepository = Depends(get_user_repo)
):
    """
    Extracts current authenticated user from a JWT token.
    """
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(401, "Invalid token")
        user = user_repo.get_user_by_id(user_id)
        if user is None:
            raise HTTPException(401, "Invalid user")
        return user
    except jwt.ExpiredSignatureError as e:
        print("JWT decode error: expired signature", str(e))
        raise HTTPException(402, "Token expired")
    except jwt.PyJWTError as e:
        print("JWT decode error:", str(e))
        raise HTTPException(401, "Invalid token")
