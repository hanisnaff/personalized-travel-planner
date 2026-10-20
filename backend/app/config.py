import os
from pathlib import Path

# Load backend/.env without requiring a third-party dotenv package.
_ENV_FILE = Path(__file__).resolve().parents[1] / ".env"
if _ENV_FILE.exists():
    for _line in _ENV_FILE.read_text(encoding="utf-8").splitlines():
        _line = _line.strip()
        if not _line or _line.startswith("#") or "=" not in _line:
            continue
        _key, _value = _line.split("=", 1)
        os.environ.setdefault(_key.strip(), _value.strip().strip('"').strip("'"))


def env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


AI_API_KEY = env("AI_API_KEY")
AI_BASE_URL = env("AI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
AI_MODEL = env("AI_MODEL", "gpt-4o-mini")
SUPABASE_URL = env("SUPABASE_URL").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = env("SUPABASE_SERVICE_ROLE_KEY")
DATABASE_PATH = env("DATABASE_PATH", str(Path(__file__).resolve().parents[1] / "travel_planner.sqlite3"))
FRONTEND_ORIGIN = env("FRONTEND_ORIGIN", "http://localhost:5173")


def supabase_enabled() -> bool:
    return bool(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)


def ai_enabled() -> bool:
    return bool(AI_API_KEY)
