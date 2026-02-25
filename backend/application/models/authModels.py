from pydantic import BaseModel, Field


class AuthRequest(BaseModel):
    username: str = Field(..., min_length=1, json_schema_extra="username")
    password: str = Field(..., min_length=8, json_schema_extra="password")
