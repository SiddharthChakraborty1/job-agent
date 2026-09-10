from pydantic import BaseModel


class User(BaseModel):
    sub: str
    email: str
    name: str
    picture: str | None = None
    isAdmin: bool = False


class GoogleAuthRequest(BaseModel):
    credential: str
