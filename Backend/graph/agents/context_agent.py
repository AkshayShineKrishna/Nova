"""
Context agent — classifies user query as 'mcp' (needs tools) or 'chat'.
Uses a fast, small LLM with a tight token budget.
"""
from langchain_core.prompts import ChatPromptTemplate

from graph.llm import context_llm
from graph.state import AgentState
from graph.prompts import CONTEXT_AGENT_PROMPT


def context_node(state: AgentState) -> AgentState:
    """Classify the incoming query."""
    # Get up to 4 recent messages for context
    recent_history = state.history[-4:] if state.history else []
    history_text = "\n".join([f"{h['role'].title()}: {h['content']}" for h in recent_history])
    if not history_text:
        history_text = "No prior context."

    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", CONTEXT_AGENT_PROMPT),
            ("human", "Recent context:\n{history}\n\nUser query: {input}"),
        ]
    )
    chain = prompt | context_llm
    response = chain.invoke({"input": state.query, "history": history_text})
    intent = response.content.strip().lower()
    if intent not in ["chat", "mcp"]:
        intent = "chat"
    return state.model_copy(update={"node": intent})


def context_router(state: AgentState) -> str:
    """Route state to the appropriate processing node."""
    return "mcp" if state.node == "mcp" else "chat"
