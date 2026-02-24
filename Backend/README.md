# Nova Backend Architecture — In-Depth Technical Documentation

This document explicitly breaks down the organization, exact inner logic paths, database paradigms, and multi-agent structures for the Nova backend application.

## 🏗 Organization & Layered Architecture
The backend employs Python 3.13, **FastAPI**, and robust dependency injection mechanisms structured around the **Layered architectural pattern**.

### Structural Breakdown
- **`main.py`**: Uvicorn server configuration. Contains the `@asynccontextmanager lifespan` that initiates Database table creation and calls `setup_tools()` to invoke child subprocesses and initialize LangGraph into the `app.state`.
- **`api/` (Router)**: Enforces validation on ingress requests by typing payloads rigorously against `schema/` objects. Relies heavily on FastAPI `Depends()` blocks to inject context databases correctly.
- **`services/` (Logic Layer)**: Exerts business policy. Modules such as `ask_service.py` not only make CRUD queries onto multiple schemas, but they execute background `asyncio.create_task()` operations (such as fire-and-forget conversation rename operations triggered via LangGraph after the first chat interaction).
- **`models/` (DB Schema)**: Strongly typed using SQLAlchemy v2 APIs (`Mapped`, `mapped_column`). Uses `uuid6.uuid7()` natively as a primary key structure, offering time-sortable 36-char string IDs. Core models interrelate tightly using mapped properties such as `ConversationSession` -> holding `ConversationMessage` tuples using explicit `cascade="all, delete-orphan"`.
- **`repository/`**: Abstractions explicitly targeting SQLAlchemy `AsyncSession` wrappers to abstract raw relational algebra strings away from business concerns (e.g., executing `stmt = select(Users).where(Users.email == email)`).
- **`security/`**: Central location parsing out ECDSA and RSA cryptography algorithms using python-jose. Exclusively issues token claims embedded with short-lived expiration tags configured in `core.Settings` (Defaults to 60 Minutes access token and equivalent refresh token lifetimes).

### LangGraph Agent Package (`graph/`)
The `graph/` repository handles all non-deterministic logic processing, structured using the `langgraph` state machine paradigm.

---

## ⚙️ How It Works in Explicit Detail

### 1. Hardened Refresh-Token Rotation Model
The Nova authentication framework enforces **Refresh Token Rotation combined with Request Replay Detection**:
1. When `/auth/login` operates, a JWT Access Token alongside a persistent JWT Refresh Token is persisted in HTTP-only cookies.
2. The Database independently logs the Refresh Token ID against the user within the `refresh_tokens` table.
3. Every API call (e.g., `/auth/me`, `/ask/stream`) checks the validity of the strictly bounded Access Token. If invalid, the frontend issues a fetch to `/auth/refresh`.
4. Endpoint `/auth/refresh` reads the exact database footprint of the refresh token. If it matches a `revoked=True` condition, **Reuse Detection trips** immediately (signaling token replay operations), revoking *ALL* refresh tokens associated with that specific user context mapping for ultimate security.
5. If valid, new cookies are pushed directly onto the internal HTTP Response headers.

### 2. Multi-Agent Systems Implementation
Unlike monolithic LangChain wrappers, Nova deploys an explicit graph network mapped out entirely using a `StateGraph`:

#### Node Architecture (`graph/agents/`)
Every execution passes through an explicit pipeline bounded by an immutable `AgentState` object consisting of `{query, history, node, messages}` payloads.
1. **The Context Router (`context_agent.py`)**: Uses a smaller, high-speed LLM to aggressively pre-parse the input format and classify user query strings mathematically or normally. Using system prompts with tight contextual history bindings (retaining last 4 contextual turns max), it emits precisely either the word `chat` or `mcp`.
2. **The Conversational Fallback (`chat_agent.py`)**: Directly binds incoming properties onto a Conversational Chat LLM, ignoring external tools and executing high-level language parsing.
3. **The Bindings Model Process (`mcp_agent.py`)**: Designed rigorously around tool integration. It consumes bound tools, injecting a complex array of metadata directly onto LLM payloads. If an execution request to the LLM (for example Groq `llama-3.1-70b-versatile`) throws `"failed_generation"` or parsing faults mid-flight, this script employs automatic try/except backoff sequences routing directly to the aforementioned Conversational LLM as a stable fail-safe mechanism.

#### MCP Orchestration Configuration
The framework seamlessly pipes external protocol connections explicitly generated via the `Model Context Protocol` (`mcp_servers/`). 
In `main.py lifespan`, `setup_tools()` connects SSE Client endpoints dynamically parsing remote JSON-RPC schemas returned out of processes like `math_mcp_server.py`. Functions dynamically read these schema schemas, creating native Langchain `StructuredTool` objects representing operations fully detailed down to exact parameters like `calculate_area_circle()` inside LangChain wrappers before compiling the final runtime.
