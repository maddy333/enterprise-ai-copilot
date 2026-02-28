import logging
from loguru import logger
import sys

# Configure standard logging to redirect to loguru
class InterceptHandler(logging.Handler):
    def emit(self, record):
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno
        frame, depth = logging.currentframe(), 2
        while frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back
            depth += 1
        logger.opt(depth=depth, exception=record.exc_info).log(level, record.getMessage())

def setup_logger():
    logging.basicConfig(handlers=[InterceptHandler()], level=0)
    for _log in ["uvicorn", "uvicorn.error", "fastapi"]:
        _logger = logging.getLogger(_log)
        _logger.handlers = [InterceptHandler()]
    logger.configure(handlers=[{"sink": sys.stdout, "serialize": True}])
    return logger

log = setup_logger()
