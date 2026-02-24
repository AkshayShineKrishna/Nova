"""
LLM instances shared across all graph agents.
All models use Groq via langchain-groq.
"""
import httpx
from langchain_groq import ChatGroq

from core import Settings

# ── HTTP clients (SSL verification relaxed for local dev) ───────────────────
http_client = httpx.Client(verify=False)
async_client = httpx.AsyncClient(verify=False)

# ── Fast classifier — minimal tokens, no temperature needed ─────────────────
context_llm = ChatGroq(
    model="llama-3.1-8b-instant",
    api_key=Settings.GROQ_API_KEY,
    http_client=http_client,
    http_async_client=async_client,
    max_tokens=10,
)

# ── General conversational LLM ───────────────────────────────────────────────
chat_llm = ChatGroq(
    model="llama-3.1-8b-instant",
    api_key=Settings.GROQ_API_KEY,
    http_client=http_client,
    http_async_client=async_client,
    temperature=0.7,
)

# ── Tool-calling LLM (larger model needed for reliable tool use) ─────────────
mcp_llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=Settings.GROQ_API_KEY,
    http_client=http_client,
    http_async_client=async_client,
)

# ── Title generator — short, deterministic names ────────────────────────────
title_llm = ChatGroq(
    model="llama-3.1-8b-instant",
    api_key=Settings.GROQ_API_KEY,
    http_client=http_client,
    http_async_client=async_client,
    max_tokens=12,
    temperature=0.3,
)
