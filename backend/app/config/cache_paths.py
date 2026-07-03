"""Cache and mock data directory paths for agents and services.

Centralizes all mock data directory constants so that agents, services,
and router code import from a single source, preventing circular imports
(service → agent → service).

Corresponding in_scope ID: workflow-orchestration
"""

from pathlib import Path

from app.utils import sanitize

MOCK_DATA_ROOT = Path("mock_data")

# audience_insight
AUDIENCE_DIR = MOCK_DATA_ROOT / "audience_insight"
PERSONA_DIR = MOCK_DATA_ROOT / "user_persona"

# market_analysis
MARKET_ANALYSIS_DIR = MOCK_DATA_ROOT / "market_analysis"

# product_info
PRODUCT_INFO_DIR = MOCK_DATA_ROOT / "product_info"


def audience_path(product_name: str) -> Path:
    return AUDIENCE_DIR / f"{sanitize(product_name)}.json"


def persona_path(product_name: str) -> Path:
    return PERSONA_DIR / f"{sanitize(product_name)}.json"


def market_analysis_path(market_name: str) -> Path:
    return MARKET_ANALYSIS_DIR / f"{sanitize(market_name)}.json"


def product_info_path(product_name: str) -> Path:
    return PRODUCT_INFO_DIR / f"{sanitize(product_name)}.json"
