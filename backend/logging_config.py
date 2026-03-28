"""
Structured Logging Configuration for Trendyol Product Dashboard

Provides:
- JSON structured logs to file (for machine parsing)
- Colored console logs (for human reading)
- Correlation ID tracking per request/report
- Rotating file handlers with size limits
- Timing context manager for operation profiling
"""

import logging
import logging.handlers
import json
import os
import time
from contextvars import ContextVar
from contextlib import contextmanager
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# Context variables for log correlation
# ---------------------------------------------------------------------------

_correlation_id: ContextVar[str] = ContextVar("correlation_id", default="-")
_report_id: ContextVar[str] = ContextVar("report_id", default="-")


def set_correlation_id(cid: str):
    _correlation_id.set(cid)


def get_correlation_id() -> str:
    return _correlation_id.get()


def set_report_id(rid):
    _report_id.set(str(rid) if rid is not None else "-")


def get_report_id() -> str:
    return _report_id.get()


# ---------------------------------------------------------------------------
# JSON Formatter (file output)
# ---------------------------------------------------------------------------

class JSONFormatter(logging.Formatter):
    """Structured JSON log formatter for file output."""

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
            "correlation_id": get_correlation_id(),
            "report_id": get_report_id(),
        }

        # Add extra fields if present
        for key in ("url", "status_code", "response_time_ms", "response_size",
                     "error_type", "duration_ms", "cb_state", "failures",
                     "batch_size", "product_count", "cache_size"):
            val = getattr(record, key, None)
            if val is not None:
                log_entry[key] = val

        # Add exception info
        if record.exc_info and record.exc_info[0] is not None:
            log_entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_entry, ensure_ascii=False, default=str)


# ---------------------------------------------------------------------------
# Console Formatter (colored, human-readable)
# ---------------------------------------------------------------------------

_LEVEL_COLORS = {
    "DEBUG": "\033[36m",     # cyan
    "INFO": "\033[32m",      # green
    "WARNING": "\033[33m",   # yellow
    "ERROR": "\033[31m",     # red
    "CRITICAL": "\033[1;31m",  # bold red
}
_RESET = "\033[0m"


class ConsoleFormatter(logging.Formatter):
    """Colored, human-readable console formatter."""

    def format(self, record: logging.LogRecord) -> str:
        color = _LEVEL_COLORS.get(record.levelname, "")
        ts = datetime.now().strftime("%H:%M:%S")
        level = record.levelname[0]  # D, I, W, E, C
        report = get_report_id()
        report_tag = f" [r:{report}]" if report != "-" else ""

        msg = record.getMessage()
        base = f"{color}{ts} [{level}]{report_tag} {msg}{_RESET}"

        if record.exc_info and record.exc_info[0] is not None:
            base += "\n" + self.formatException(record.exc_info)

        return base


# ---------------------------------------------------------------------------
# Setup function
# ---------------------------------------------------------------------------

def setup_logging(log_dir: str = None):
    """
    Configure the entire logging system. Call once at startup.

    Creates:
    - logs/trendyol.log  (all levels, JSON, 10MB x 5 rotation)
    - logs/errors.log    (WARNING+, JSON, 10MB x 3 rotation)
    - console output     (INFO+, colored)
    """
    if log_dir is None:
        log_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "logs")

    os.makedirs(log_dir, exist_ok=True)

    root = logging.getLogger("trendyol")
    root.setLevel(logging.DEBUG)

    # Prevent duplicate handlers on reload
    if root.handlers:
        return

    json_fmt = JSONFormatter()
    console_fmt = ConsoleFormatter()

    # 1. Main log file — all levels, JSON
    main_handler = logging.handlers.RotatingFileHandler(
        os.path.join(log_dir, "trendyol.log"),
        maxBytes=10 * 1024 * 1024,  # 10 MB
        backupCount=5,
        encoding="utf-8",
    )
    main_handler.setLevel(logging.DEBUG)
    main_handler.setFormatter(json_fmt)
    root.addHandler(main_handler)

    # 2. Error log file — WARNING+, JSON
    error_handler = logging.handlers.RotatingFileHandler(
        os.path.join(log_dir, "errors.log"),
        maxBytes=10 * 1024 * 1024,
        backupCount=3,
        encoding="utf-8",
    )
    error_handler.setLevel(logging.WARNING)
    error_handler.setFormatter(json_fmt)
    root.addHandler(error_handler)

    # 3. Console — INFO+, colored
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(console_fmt)
    root.addHandler(console_handler)

    # Quiet noisy libraries
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)


# ---------------------------------------------------------------------------
# Logger factory
# ---------------------------------------------------------------------------

def get_logger(name: str) -> logging.Logger:
    """Get a namespaced logger: trendyol.<name>"""
    return logging.getLogger(f"trendyol.{name}")


# ---------------------------------------------------------------------------
# Timing context manager
# ---------------------------------------------------------------------------

@contextmanager
def log_timing(logger: logging.Logger, operation: str, level=logging.INFO, **extra):
    """Context manager that logs operation duration."""
    start = time.monotonic()
    try:
        yield
    finally:
        elapsed_ms = round((time.monotonic() - start) * 1000, 1)
        logger.log(
            level,
            f"{operation} completed in {elapsed_ms}ms",
            extra={"duration_ms": elapsed_ms, **extra},
        )
