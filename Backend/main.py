from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from api import test_route, auth_route, ask_route
from core import engine, Base, setup_logging
from graph import setup_tools, build_graph

setup_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Ensure DB tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 2. Connect to MCP SSE servers and compile the LangGraph agent
    tools = await setup_tools()
    graph = await build_graph(tools)
    app.state.graph = graph

    yield


fast_app = FastAPI(
    lifespan=lifespan
)

fast_app.include_router(test_route)
fast_app.include_router(auth_route)
fast_app.include_router(ask_route)
fast_app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173","http://localhost:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    uvicorn.run(app="main:fast_app", port=8090, reload=True)
