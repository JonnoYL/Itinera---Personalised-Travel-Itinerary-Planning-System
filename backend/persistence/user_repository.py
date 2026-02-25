from database.database import UserDatabase
from application.models.user import UserResponse
from typing import Optional


class UserRepository:
    def __init__(self, db):
        self.db_layer = UserDatabase(db)

    def create_user(self, user_dict: dict) -> UserResponse:
        """Insert a new user into the database"""
        new_user = self.db_layer.create_user(user_dict)
        return UserResponse.model_validate(new_user)

    def get_user_by_id(self, user_id: int) -> Optional[UserResponse]:
        """Get user by ID - return None if not found"""
        database_response = self.db_layer.get_user_by_id(user_id)
        if database_response is None:
            return None
        return UserResponse.model_validate(database_response)

    def get_user_by_username(self, username: int) -> Optional[UserResponse]:
        """Get user by username - return None if not found"""
        database_response = self.db_layer.get_user_by_username(username)
        if database_response is None:
            return None
        return UserResponse.model_validate(database_response)
