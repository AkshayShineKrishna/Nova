"""
Graph package — public API.

Module structure:
  state.py          AgentState
  llm.py            LLM instances (context, chat, mcp, title)
  mcp_client.py     MCP SSE server tool setup
  agents/
    context_agent   query classifier + router
    chat_agent      general chat node
    mcp_agent       tool-calling node (math + joke)
    title_agent     conversation title generator
  graph.py          LangGraph wiring (build_graph)
"""
from .state import AgentState
from .mcp_client import setup_tools
from .graph import build_graph
from .agents.title_agent import generate_conversation_title

__all__ = ["AgentState", "setup_tools", "build_graph", "generate_conversation_title"]
