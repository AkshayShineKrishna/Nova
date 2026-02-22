from fastapi import APIRouter, Depends
from pydantic import BaseModel

from models import Users
from security.filter import get_current_user

ask_route = APIRouter(prefix="/ask", tags=["Ask"])


class AskRequest(BaseModel):
    query: str


class AskResponse(BaseModel):
    answer: str


@ask_route.post("", response_model=AskResponse)
async def ask(
        body: AskRequest,
        current_user: Users = Depends(get_current_user),
):
    """Protected chat endpoint. Returns a mock response for now."""
    # TODO: replace with real LLM call
    return AskResponse(
        answer=f"[Mock] You asked: '{body.query}'. Real AI response coming soon."
    )
