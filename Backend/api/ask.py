"""
Ask endpoints — protected by JWT cookie auth.

Endpoints
---------
POST   /ask                              → full JSON (creates/continues session)
GET    /ask/stream                       → SSE token-by-token (creates/continues session)
GET    /ask/sessions                     → list all conversation sessions for current user
GET    /ask/sessions/{session_id}        → messages for a specific session
DELETE /ask/sessions/{session_id}        → delete a session and all its messages
"""
import asyncio
import json
import logging

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from core import get_async_session
from graph import AgentState
from models import Users
from repository.conversation_repository import ConversationRepository
from schema import AskRequest, AskResponse, MessageOut, SessionOut
from security.filter import get_current_user
from services.ask_service import AskService

logger = logging.getLogger(__name__)

ask_route = APIRouter(prefix="/ask", tags=["Ask"])


# ── Dependency factory ────────────────────────────────────────────────────────
def get_ask_service(
    db: AsyncSession = Depends(get_async_session),
) -> AskService:
    repo = ConversationRepository(db)
    return AskService(repo=repo, db=db)


# ── Internal helpers ──────────────────────────────────────────────────────────
def _get_graph(request: Request):
    return request.app.state.graph


# ── POST /ask  (classic JSON response) ───────────────────────────────────────
@ask_route.post("", response_model=AskResponse)
async def ask(
    body: AskRequest,
    request: Request,
    current_user: Users = Depends(get_current_user),
    service: AskService = Depends(get_ask_service),
):
    """Protected chat endpoint — returns a full JSON response."""
    graph = _get_graph(request)

    session = await service.get_or_create_session(current_user.id, body.session_id)
    history = await service.load_history(session.id)

    result = await graph.ainvoke(input=AgentState(query=body.query, history=history))
    answer = result.get("answer") or ""

    await service.save_turn(session.id, body.query, answer)

    # Fire-and-forget title generation (first turn only)
    asyncio.create_task(service.maybe_set_title(session, body.query, answer))

    return AskResponse(
        answer=answer,
        session_id=session.id,
        session_name=session.name,
    )


# ── GET /ask/stream  (SSE streaming) ─────────────────────────────────────────
@ask_route.get("/stream")
async def ask_stream(
    query: str,
    request: Request,
    current_user: Users = Depends(get_current_user),
    service: AskService = Depends(get_ask_service),
    session_id: str | None = None,
):
    """
    Protected SSE streaming endpoint — token-by-token response.

    Event format:
        data: {"type": "session",  "session_id": "...", "session_name": "..."}\\n\\n
        data: {"type": "token",    "token": "..."}\\n\\n
        data: {"type": "done"}\\n\\n
        data: {"type": "error",   "error": "..."}\\n\\n
    """
    graph = _get_graph(request)
    session = await service.get_or_create_session(current_user.id, session_id)
    history = await service.load_history(session.id)
    state = AgentState(query=query, history=history)

    # Tool name sets for source classification
    _JOKE_TOOLS = {"get_random_joke", "get_joke_by_category", "list_joke_categories"}
    _MATH_TOOLS = {
        "add", "subtract", "multiply", "divide", "power", "modulus", "sqrt",
        "calculate_area_circle", "calculate_area_rectangle", "calculate_area_triangle",
    }

    async def event_generator():
        # Emit session metadata first so client can track the session
        yield f"data: {json.dumps({'type': 'session', 'session_id': session.id, 'session_name': session.name})}\n\n"

        full_answer: list[str] = []
        tools_called: set[str] = set()
        final_node: str = "chat_node"
        try:
            async for event in graph.astream_events(input=state, version="v2"):
                kind = event.get("event")

                # Track which tools were actually invoked
                if kind == "on_tool_start":
                    tool_name = event.get("name", "")
                    tools_called.add(tool_name)

                if kind == "on_chat_model_stream":
                    node_name = event.get("metadata", {}).get("langgraph_node", "")
                    # Only stream tokens from the answer nodes, not the classifier
                    if node_name in ("chat_node", "mcp_node"):
                        final_node = node_name
                        token = event["data"]["chunk"].content
                        if token:
                            full_answer.append(token)
                            yield f"data: {json.dumps({'type': 'token', 'token': token}, ensure_ascii=False)}\n\n"

            # Determine response source
            if tools_called & _JOKE_TOOLS:
                source = "mcp_joke"
            elif tools_called & _MATH_TOOLS:
                source = "mcp_math"
            else:
                source = "chat"
            yield f"data: {json.dumps({'type': 'source', 'source': source})}\n\n"

            # Persist and generate title after full answer
            answer_text = "".join(full_answer)
            if answer_text:
                await service.save_turn(session.id, query, answer_text)
                await service.maybe_set_title(session, query, answer_text)

        except Exception as exc:
            logger.exception("Streaming error: %s", exc)
            yield f"data: {json.dumps({'type': 'error', 'error': str(exc)})}\n\n"

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── GET /ask/sessions  (list user's sessions) ────────────────────────────────
@ask_route.get("/sessions", response_model=list[SessionOut])
async def list_sessions(
    current_user: Users = Depends(get_current_user),
    service: AskService = Depends(get_ask_service),
):
    """Return all conversation sessions for the current user, newest first."""
    sessions = await service.list_sessions(current_user.id)
    return [
        SessionOut(id=s.id, name=s.name, created_at=str(s.created_at))
        for s in sessions
    ]


# ── GET /ask/sessions/{session_id}  (messages in a session) ──────────────────
@ask_route.get("/sessions/{session_id}", response_model=list[MessageOut])
async def get_session_messages(
    session_id: str,
    current_user: Users = Depends(get_current_user),
    service: AskService = Depends(get_ask_service),
):
    """Return all messages in a session (must belong to current user)."""
    msgs = await service.get_session_messages(session_id, current_user.id)
    return [
        MessageOut(
            id=m.id,
            role=m.role.value,
            content=m.content,
            created_at=str(m.created_at),
        )
        for m in msgs
    ]


# ── DELETE /ask/sessions/{session_id} ────────────────────────────────────────
@ask_route.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    current_user: Users = Depends(get_current_user),
    service: AskService = Depends(get_ask_service),
):
    """Delete a session and all its messages (cascaded)."""
    await service.delete_session(session_id, current_user.id)
    return {"message": "Session deleted."}
