"""
MCP agent — tool-calling node that invokes math and joke MCP servers.
The bound LLM is configured once by build_graph() via configure().
"""
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

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


async def mcp_node(state: AgentState) -> AgentState:
    """
    Invoke the tool-capable LLM. If it requests tool calls, the graph
    routes to ToolNode, which runs the tools and comes back here.
    """
    if not state.messages:
        history_messages = _history_to_messages(state.history)
        state = state.model_copy(
            update={
                "messages": [
                    SystemMessage(
                        content=(
                            "You are Nova, a smart AI assistant. "
                            "You have tools available for math calculations and jokes. "
                            "IMPORTANT RULES:\n"
                            "1. When the user asks for a joke (any kind), you MUST call the get_random_joke or get_joke_by_category tool. Never write a joke yourself.\n"
                            "2. For math, always use the math tools rather than computing yourself.\n"
                            "3. After a tool returns a result, you MUST output the EXACT text of the joke or math result in your final response. Do not just say you got a result."
                        )
                    )
                ]
                + history_messages
                + [HumanMessage(content=state.query)]
            }
        )

    response = await _mcp_llm_with_tools.ainvoke(input=list(state.messages))
    return state.model_copy(
        update={
            "messages": list(state.messages) + [response],
            "answer": response.content,
        }
    )


def tool_router(state: AgentState) -> str:
    """Route to tool_node if there are pending tool calls, otherwise END."""
    last = state.messages[-1] if state.messages else None
    if last and getattr(last, "tool_calls", None):
        return "tool_node"
    return END
