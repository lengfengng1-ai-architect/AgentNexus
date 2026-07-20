"""Global Pydantic serializer warnings — catch and log via logging instead of stderr."""

import logging
import warnings
from collections.abc import Callable

import pydantic

logger = logging.getLogger(__name__)


def _pydantic_serialization_warning_handler(
    message: pydantic.PydanticSerializationError | warnings.WarningMessage,
    category: type[Warning],
    filename: str,
    lineno: int,
    file: object = None,
    line: str | None = None,
) -> None:
    """Route Pydantic serialization UserWarning to logging, not stderr.

    These warnings fire on every xlsx export and can't be suppressed via
    model_config because they come from Pydantic's internal JSON serializer
    encountering types it can't natively serialize (even though we provide a
    ``default=str`` fallback at the call site). Routing them through logging
    keeps stderr clean and the cause discoverable in logs/app.log.
    """
    logger.warning("Pydantic serializer warning: %s", message.message if hasattr(message, "message") else message)


def install_pydantic_serialization_warning_handler() -> None:
    warnings.showwarning = _pydantic_serialization_warning_handler  # type: ignore[method-assign]
