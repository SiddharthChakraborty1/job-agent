from pydantic import BaseModel


class User(BaseModel):
    sub: str
    email: str
    name: str
    picture: str | None = None


class GoogleAuthRequest(BaseModel):
    credential: str
