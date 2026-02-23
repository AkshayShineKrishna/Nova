"""
Graph wiring — assembles all agents into a compiled LangGraph.

All node logic lives in graph/agents/. This file only handles wiring.
"""
from langgraph.constants import START, END
from langgraph.graph import StateGraph
from langgraph.prebuilt import ToolNode

from graph.agents.context_agent import context_node, context_router
from graph.agents.chat_agent import chat_node
from graph.agents.mcp_agent import mcp_node, tool_router, configure as configure_mcp
from graph.llm import mcp_llm
from graph.state import AgentState


async def build_graph(tools):
    """
    Build and compile the Nova LangGraph agent.

    Must be called after setup_tools() so tools are available for binding.
    Stores the compiled graph on app.state.graph in main.py lifespan.
    """
    # Bind tools to the MCP LLM and inject into the mcp_agent module
    mcp_llm_with_tools = mcp_llm.bind_tools(tools=tools)
    configure_mcp(mcp_llm_with_tools)

    graph = StateGraph(AgentState)
    tool_node = ToolNode(tools=tools)

    # Register nodes
    graph.add_node("context_node", context_node)
    graph.add_node("mcp_node", mcp_node)
    graph.add_node("chat_node", chat_node)
    graph.add_node("tool_node", tool_node)

    # Edges
    graph.add_edge(START, "context_node")
    graph.add_conditional_edges(
        "context_node",
        context_router,
        {"mcp": "mcp_node", "chat": "chat_node"},
    )
    graph.add_edge("chat_node", END)
    graph.add_conditional_edges(
        "mcp_node",
        tool_router,
        {"tool_node": "tool_node", END: END},
    )
    graph.add_edge("tool_node", "mcp_node")

    return graph.compile()
