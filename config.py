import os
from dotenv import load_dotenv

load_dotenv()


def require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Fehlende Umgebungsvariable: {name}")
    return value


def env_to_bool(name: str, default: str = "false") -> bool:
    return os.getenv(name, default).strip().lower() in {"1", "true", "yes", "on"}


GRAPH_URL = require_env("GRAPH_URL")
TOKENS_URL = require_env("TOKENS_URL")

CACHE_DIR = "cache"
os.makedirs(CACHE_DIR, exist_ok=True)
GRAPH_FILE = os.path.join(CACHE_DIR, "graph.dat.zst")
TOKENS_FILE = os.path.join(CACHE_DIR, "tokens.dat.zst")

VISIBLE_LIMIT = 300
SIDEBAR_LIST_LIMIT = 500

NODE_SIZE_MULTIPLIER = 1.0
BASE_EDGE_WIDTH = 3.0
BOLD_EDGE_WIDTH = 10.0

DEFAULT_FILTER_LIMIT = 500
DEFAULT_ALGORITHM = "drl"

HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "8000"))
PRODUCTION_MODE = env_to_bool("PRODUCTION_MODE")
WAITRESS_THREADS = int(os.getenv("WAITRESS_THREADS", "4"))
