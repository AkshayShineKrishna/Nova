"""
MCP client — connects to the math and joke SSE servers and caches tools.
"""
from langchain_mcp_adapters.client import MultiServerMCPClient

_tools = None


async def setup_tools():
    """
    Connect to MCP SSE servers (math @ 8001) and return the
    combined tool list. Result is cached; safe to call multiple times.
    """
    global _tools
    if _tools is not None:
        return _tools

    client = MultiServerMCPClient(
        {
            "math": {
                "url": "http://localhost:8001/sse",
                "transport": "sse",
            },
        }
    )
    _tools = await client.get_tools()
    return _tools
