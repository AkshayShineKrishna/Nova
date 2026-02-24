"""
Chat agent — handles general conversational queries with history context.
"""
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from graph.llm import chat_llm
from graph.state import AgentState
from graph.prompts import CHAT_AGENT_PROMPT


def _history_to_messages(history: list[dict]) -> list:
    msgs = []
    for h in history:
        if h["role"] == "human":
            msgs.append(HumanMessage(content=h["content"]))
        else:
            msgs.append(AIMessage(content=h["content"]))
    return msgs


async def chat_node(state: AgentState) -> AgentState:
    """Respond to the user using prior conversation as context."""
    messages = (
        [
            SystemMessage(content=CHAT_AGENT_PROMPT)
        ]
        + _history_to_messages(state.history)
        + [HumanMessage(content=state.query)]
    )
    response = await chat_llm.ainvoke(messages)
    return state.model_copy(
        update={"answer": response.content, "messages": [response]}
    )
