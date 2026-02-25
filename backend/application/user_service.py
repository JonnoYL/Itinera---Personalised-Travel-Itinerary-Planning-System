from persistence.user_repository import UserRepository
from application.models.user import AuthResponse, UserResponse
from application.models.authModels import AuthRequest
from fastapi import HTTPException
from dotenv import load_dotenv
import os
import datetime
import bcrypt
import jwt


load_dotenv()
JWT_SECRET = os.getenv("JWT_SECRET")
ALGORITHM = "HS256"

class UserService:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    def get_user_by_id(self, user_id: int) -> UserResponse:
        """
        Retrieves user by ID.
        Returns user_id, username and password hash.
        """
        user = self.user_repo.get_user_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=404,
                detail=f"User with ID {user_id} not found"
            )
        return user

    def get_user_by_username(self, username: str) -> UserResponse:
        """
        Get user by username.
        Returns user id, username and password hash.
        """
        user = self.user_repo.get_user_by_username(username)
        if not user:
            raise HTTPException(
                status_code=404,
                detail=f"User with username {username} not found"
            )
        return user

    def signup(self, request: AuthRequest) -> AuthResponse:
        """Register a new user and return an authentication token"""
        username = request.username
        password = request.password

        if not username:
            raise HTTPException(status_code=400, detail="Username cannot be empty")
        if not password:
            raise HTTPException(status_code=400, detail="Password cannot be empty")

        if self.user_repo.get_user_by_username(username):
            raise HTTPException(
                status_code=400,
                detail="Username already exists"
            )

        if len(password) < 8:
            raise HTTPException(
                status_code=400,
                detail="Password must be at least 8 characters long"
            )

        # hash password
        password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

        user_dict = {'username': username, 'password_hash': password_hash}

        # insert user in database
        try:
            new_user = self.user_repo.create_user(user_dict)
        except Exception as e:
            print(e)
            raise HTTPException(status_code=500, detail='Database Error')

        # generate JWT token, expires in an hour
        payload = {
            "sub": str(new_user.user_id), # string to satisfy PyJWT's subject validation
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=1),
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)
        return {"token": token, "user_id": new_user.user_id}

    def login(self, request: AuthRequest) -> AuthResponse:
        """Authenticate a user and return a JWT token"""
        username = request.username
        password = request.password

        user = self.user_repo.get_user_by_username(username)
        if not user:
            raise HTTPException(
                status_code=400,
                detail="No such username"
            )

         # verify password against hash
        if not bcrypt.checkpw(
            password.encode("utf-8"), user.password_hash.encode("utf-8")
        ):
            raise HTTPException(status_code=400, detail="Incorrect password")

        # generate JWT token, expires in an hour
        payload = {
            "sub": str(user.user_id), # a string to satisfy PyJWT's subject validation
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=1),
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)
        return {"token": token, "user_id": user.user_id}
