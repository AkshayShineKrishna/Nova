import re

from pydantic import BaseModel, EmailStr, ConfigDict, field_validator


class CreateUser(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 5 or len(v) > 50:
            raise ValueError("Password must be between 5 and 50 characters")

        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")

        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")

        if not re.search(r"[\W_]", v):
            raise ValueError("Password must contain at least one special character")

        return v


class ReadUser(BaseModel):
    id: str
    email: EmailStr
    model_config = ConfigDict(from_attributes=True)
