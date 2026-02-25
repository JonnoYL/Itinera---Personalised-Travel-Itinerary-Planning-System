from pydantic import BaseModel, ConfigDict


class UserResponse(BaseModel):
    user_id: int
    username: str
    password_hash: str

    model_config = ConfigDict(from_attributes=True)

class UserPublicResponse(BaseModel):
    user_id: int
    username: str

    model_config = ConfigDict(from_attributes=True)

class AuthResponse(BaseModel):
    token: str
    user_id: int

    model_config = ConfigDict(from_attributes=True)
