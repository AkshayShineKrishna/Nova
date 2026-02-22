import logging

# ANSI escape codes
RESET = "\033[0m"
BOLD = "\033[1m"
DIM = "\033[2m"

LEVEL_COLORS = {
    logging.DEBUG:    "\033[36m",   # cyan
    logging.INFO:     "\033[32m",   # green
    logging.WARNING:  "\033[33m",   # yellow
    logging.ERROR:    "\033[31m",   # red
    logging.CRITICAL: "\033[1;31m", # bold red
}


class ColorFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        color = LEVEL_COLORS.get(record.levelno, RESET)
        time = self.formatTime(record, "%H:%M:%S")
        level = f"{color}{record.levelname:<8}{RESET}"
        name = f"{DIM}{record.name}{RESET}"
        message = f"{BOLD}{record.getMessage()}{RESET}" if record.levelno >= logging.WARNING else record.getMessage()
        return f"{DIM}{time}{RESET} {level} {name} — {message}"


def setup_logging(level: int = logging.INFO) -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(ColorFormatter())

    root = logging.getLogger()
    root.setLevel(level)
    root.handlers.clear()  # remove any handlers basicConfig may have added
    root.addHandler(handler)

    # Route uvicorn loggers through the root logger (our handler) instead of
    # letting uvicorn install its own handlers — avoids double-printing.
    for name in ("uvicorn", "uvicorn.access", "uvicorn.error"):
        logging.getLogger(name).propagate = True
        logging.getLogger(name).handlers.clear()

    # Silence SQLAlchemy SQL echo unless explicitly enabled via echo=True on
    # the engine.  Setting propagate=True lets it use our root handler, but
    # we cap its level at WARNING so routine SQL statements stay hidden.
    sa_logger = logging.getLogger("sqlalchemy.engine")
    sa_logger.propagate = True
    sa_logger.setLevel(logging.WARNING)
