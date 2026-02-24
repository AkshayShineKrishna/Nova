"""
MCP agent — tool-calling node that invokes math and joke MCP servers.
The bound LLM is configured once by build_graph() via configure().
"""
import logging

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

logger = logging.getLogger(__name__)

from graph.state import AgentState
from langgraph.constants import END

# Module-level reference set by graph.build_graph()
_mcp_llm_with_tools = None


def configure(llm_with_tools) -> None:
    """Called by build_graph() after binding tools to the MCP LLM."""
    global _mcp_llm_with_tools
    _mcp_llm_with_tools = llm_with_tools


def _history_to_messages(history: list[dict]) -> list:
    msgs = []
    for h in history:
        if h["role"] == "human":
            msgs.append(HumanMessage(content=h["content"]))
        else:
            msgs.append(AIMessage(content=h["content"]))
    return msgs


async def mcp_node(state: AgentState) -> dict:
    """
    Invoke the tool-capable LLM. If it requests tool calls, the graph
    routes to ToolNode, which runs the tools and comes back here.
    """
    messages_to_add = []
    if not state.messages:
        history_messages = _history_to_messages(state.history)
        messages_to_add = [
            SystemMessage(
                content=(
                    "You are Nova, a smart AI assistant. "
                    "You have tools available for math calculations. "
                    "IMPORTANT RULES:\n"
                    "1. For math, always use the math tools rather than computing yourself.\n"
                    "2. After a tool returns a result, you MUST output the EXACT text of the math result in your final response. Do not just say you got a result."
                )
            )
        ] + history_messages + [HumanMessage(content=state.query)]

    # Pass all existing messages + any newly constructed ones to the LLM
    input_messages = list(state.messages) + messages_to_add

    try:
        response = await _mcp_llm_with_tools.ainvoke(input=input_messages)
    except Exception as exc:
        err_msg = str(exc).lower()
        if "failed_generation" in err_msg or "failed to call a function" in err_msg:
            logger.warning("MCP LLM failed tool generation, falling back to standard chat LLM: %s", exc)
            from graph.llm import chat_llm
            response = await chat_llm.ainvoke(input=input_messages)
        else:
            raise

    messages_to_add.append(response)

    return {
        "messages": messages_to_add,
        "answer": response.content,
    }


def tool_router(state: AgentState) -> str:
    """Route to tool_node if there are pending tool calls, otherwise END."""
    last = state.messages[-1] if state.messages else None
    if last and getattr(last, "tool_calls", None):
        return "tool_node"
    return END
