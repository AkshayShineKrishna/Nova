"""
Joke MCP Server — runs as a standalone FastMCP SSE server on port 8002.
Start with: python mcp_servers/joke_mcp_server.py
"""
import random

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("JokeServer",port=8002)

_JOKES: dict[str, list[str]] = {
    "math": [
        "Why was the math book sad? Because it had too many problems.",
        "I asked my math teacher if I could use a calculator. She said, 'Of course — but can you figure out how to turn it on?'",
        "Why do mathematicians like parks? Because of all the natural logs.",
        "Parallel lines have so much in common. It's a shame they'll never meet.",
        "What do you call a number that can't keep still? A roamin' numeral.",
        "A statistician drowned crossing a river that was, on average, 6 inches deep.",
        "Why did the student get bad grades in geometry? Because he thought pi was something you ate.",
    ],
    "programming": [
        "Why do programmers prefer dark mode? Because light attracts bugs.",
        "A QA engineer walks into a bar. Orders 0 beers. Orders 999999 beers. Orders -1 beers. Orders a lizard. Orders null. Orders asfasdf.",
        "There are only 10 types of people: those who understand binary, and those who don't.",
        "Why do Java developers wear glasses? Because they don't C#.",
        "A programmer's partner says: 'Go to the store and buy a loaf of bread. If they have eggs, buy a dozen.' Programmer returns with 12 loaves of bread.",
        "How many programmers does it take to change a lightbulb? None — that's a hardware problem.",
        "I told my computer I needed a break. Now it won't stop sending me Kit-Kat ads.",
    ],
    "pun": [
        "I'm reading a book about anti-gravity. It's impossible to put down.",
        "I used to hate facial hair, but then it grew on me.",
        "I'm on a seafood diet. I see food, and I eat it.",
        "Time flies like an arrow. Fruit flies like a banana.",
        "I would tell you a chemistry joke, but I know I wouldn't get a reaction.",
        "Did you hear about the claustrophobic astronaut? He just needed a little space.",
        "I asked the librarian if they had books about paranoia. She whispered: 'They're right behind you.'",
    ],
    "general": [
        "Why don't scientists trust atoms? Because they make up everything.",
        "I told my wife she was drawing her eyebrows too high. She looked surprised.",
        "I asked my dog what 2 minus 2 is. He said nothing.",
        "What do you call a fake noodle? An impasta.",
        "I used to play piano by ear, but now I use my hands.",
        "Why can't you give Elsa a balloon? Because she'll let it go.",
        "What do sprinters eat before a race? Nothing — they fast.",
    ],
}


@mcp.tool()
def get_random_joke() -> str:
    """Return a random joke from any category."""
    all_jokes = [j for jokes in _JOKES.values() for j in jokes]
    return random.choice(all_jokes)


@mcp.tool()
def get_joke_by_category(category: str) -> str:
    """
    Return a random joke for the specified category.
    Available categories: math, programming, pun, general.
    """
    key = category.lower().strip()
    if key not in _JOKES:
        available = ", ".join(_JOKES.keys())
        return f"Category '{category}' not found. Available: {available}"
    return random.choice(_JOKES[key])


@mcp.tool()
def list_joke_categories() -> list[str]:
    """List all available joke categories."""
    return list(_JOKES.keys())


if __name__ == "__main__":
    mcp.run(transport="sse")
