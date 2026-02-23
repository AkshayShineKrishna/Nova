from pydantic import BaseModel


class AskRequest(BaseModel):
    query: str
    session_id: str | None = None   # pass to continue an existing session


class AskResponse(BaseModel):
    answer: str
    session_id: str
    session_name: str | None


class MessageOut(BaseModel):
    id: str
    role: str          # "human" or "assistant"
    content: str
    created_at: str


class SessionOut(BaseModel):
    id: str
    name: str | None
    created_at: str


class RenameSessionRequest(BaseModel):
    name: str
