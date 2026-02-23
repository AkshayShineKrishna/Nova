"""
AgentState — shared state object threaded through LangGraph nodes.
"""
from typing import Annotated, Sequence

from langchain_core.messages import BaseMessage
from langgraph.graph import add_messages
from pydantic import BaseModel


class AgentState(BaseModel):
    query: str
    # Prior messages fed as context: [{"role": "human"|"assistant", "content": str}]
    history: list[dict] = []
    answer: str | None = None
    node: str | None = None
    messages: Annotated[Sequence[BaseMessage], add_messages] = []
