import asyncio
from graph.graph import build_graph
from graph.mcp_client import setup_tools
from graph.state import AgentState

async def test():
    tools = await setup_tools()
    graph = await build_graph(tools)
    
    # query that context_agent routes to MCP because it says math, but it's not a real math
    state = AgentState(query="Calculate the average of nothing and tell me about the history of math, also write a poem", history=[])
    try:
        state = await graph.ainvoke(state)
        print("Response:", state.get("answer"))
    except Exception as e:
        print(f"\nError occurred: {type(e).__name__}: {e}")

if __name__ == "__main__":
    asyncio.run(test())
