"""
Title agent — generates a short, descriptive name for a new conversation.

Called once after the first turn of a session so the user sees a meaningful
title (e.g. "Circle Area Calculation") instead of "New Conversation".
"""
from langchain_core.prompts import ChatPromptTemplate

from graph.llm import title_llm


async def generate_conversation_title(query: str, answer: str) -> str:
    """
    Generate a concise title (≤ 6 words) for a conversation given the first
    human query and the assistant's answer.

    Returns a plain string without quotes or punctuation.
    """
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are a conversation title generator. "
                "Given the first message and reply of a conversation, "
                "produce a short title of at most 6 words that captures the topic. "
                "Return ONLY the title — no quotes, no punctuation at the end.",
            ),
            (
                "human",
                "User message: {query}\nAssistant reply: {answer}",
            ),
        ]
    )
    chain = prompt | title_llm
    response = await chain.ainvoke({"query": query[:300], "answer": answer[:300]})
    title = response.content.strip().strip('"').strip("'")
    # Truncate to 80 chars as a safety net
    return title[:80] if title else "New Conversation"
