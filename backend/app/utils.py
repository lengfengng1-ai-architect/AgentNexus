"""Shared utility functions for agents and services.

ponytail: This is a bag of extracted duplicate functions. If a function grows
beyond ~20 lines or gains module-level state, break it into its own module.
"""

import re
from typing import Any

from bs4 import BeautifulSoup


def sanitize(name: str) -> str:
    """Convert a name to a filesystem-safe identifier.

    Replaces non-word characters (including CJK) with underscores.
    """
    safe = re.sub(r"[^\w一-鿿]+", "_", name).strip("_").lower()
    return safe if safe else "unknown"


def parse_budget(value: Any) -> int:
    """Extract integer budget from string like '200万元' or number."""
    if isinstance(value, int | float):
        return int(value)
    if isinstance(value, str):
        digits = "".join(c for c in value if c.isdigit() or c == ".")
        return int(float(digits)) if digits else 0
    return 0


def parse_period(value: Any) -> int:
    """Extract integer period from string like '3个月' or number.

    匹配规则：取文本中第一个数字作为周期月数（不拼接多个数字）。
    """
    if isinstance(value, int | float):
        return int(value)
    if isinstance(value, str):
        # 取文本中第一个遇到的数字
        match = re.search(r"\d+", value)
        return int(match.group()) if match else 3
    return 3


def extract_text_from_html(html: str) -> str:
    """Strip HTML tags and return clean text content."""
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()
    text = soup.get_text(separator="\n", strip=True)
    return "\n".join(line.strip() for line in text.split("\n") if line.strip())
