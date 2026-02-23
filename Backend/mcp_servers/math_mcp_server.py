"""
Math MCP Server — runs as a standalone FastMCP SSE server on port 8001.
Start with: python mcp_servers/math_mcp_server.py
"""
import math as _math

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("MathServer",port=8001)


@mcp.tool()
def add(a: float, b: float) -> float:
    """Return the sum of two numbers."""
    return a + b


@mcp.tool()
def subtract(a: float, b: float) -> float:
    """Return the difference of two numbers (a - b)."""
    return a - b


@mcp.tool()
def multiply(a: float, b: float) -> float:
    """Return the product of two numbers."""
    return a * b


@mcp.tool()
def divide(a: float, b: float) -> float:
    """Return the division of two numbers (a / b). Raises error on divide-by-zero."""
    if b == 0:
        raise ValueError("Cannot divide by zero")
    return a / b


@mcp.tool()
def power(base: float, exponent: float) -> float:
    """Return base raised to the power of exponent."""
    return base ** exponent


@mcp.tool()
def modulus(a: float, b: float) -> float:
    """Return the remainder of a divided by b."""
    if b == 0:
        raise ValueError("Cannot perform modulus with zero")
    return a % b


@mcp.tool()
def sqrt(n: float) -> float:
    """Return the square root of a non-negative number."""
    if n < 0:
        raise ValueError("Cannot take square root of a negative number")
    return _math.sqrt(n)


@mcp.tool()
def calculate_area_circle(radius: float) -> float:
    """Calculate the area of a circle given its radius."""
    return _math.pi * (radius ** 2)


@mcp.tool()
def calculate_area_rectangle(length: float, width: float) -> float:
    """Calculate the area of a rectangle given its length and width."""
    return length * width


@mcp.tool()
def calculate_area_triangle(base: float, height: float) -> float:
    """Calculate the area of a triangle given its base and height."""
    return 0.5 * base * height


if __name__ == "__main__":
    mcp.run(transport="sse")
