"""
Context agent — classifies user query as 'mcp' (needs tools) or 'chat'.
Uses a fast, small LLM with a tight token budget.
"""
from langchain_core.prompts import ChatPromptTemplate

from graph.llm import context_llm
from graph.state import AgentState


def context_node(state: AgentState) -> AgentState:
    """Classify the incoming query."""
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are a classifier. "
                "If the query is about math, calculation, numbers, or jokes return 'mcp'. "
                "Otherwise return 'chat'. "
                "Respond with only one word.",
            ),
            ("human", "{input}"),
        ]
    )
    chain = prompt | context_llm
    response = chain.invoke({"input": state.query})
    intent = response.content.strip().lower()
    if intent not in ["chat", "mcp"]:
        intent = "chat"
    return state.model_copy(update={"node": intent})


def context_router(state: AgentState) -> str:
    """Route state to the appropriate processing node."""
    return "mcp" if state.node == "mcp" else "chat"
