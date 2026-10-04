import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
)

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")

FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:5173",
).rstrip("/")

ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()

_allowed_origins = os.getenv("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS = [
    origin.strip().rstrip("/")
    for origin in _allowed_origins.split(",")
    if origin.strip()
]

for origin in [
    FRONTEND_URL,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]:
    if origin and origin not in ALLOWED_ORIGINS:
        ALLOWED_ORIGINS.append(origin)

PASSWORD_RESET_MINUTES = int(
    os.getenv("PASSWORD_RESET_MINUTES", "15")
)
PASSWORD_RESET_DEBUG = (
    os.getenv("PASSWORD_RESET_DEBUG", "false").lower() == "true"
)

PASSWORD_RESET_REQUEST_LIMIT = int(
    os.getenv("PASSWORD_RESET_REQUEST_LIMIT", "3")
)
PASSWORD_RESET_REQUEST_WINDOW = int(
    os.getenv("PASSWORD_RESET_REQUEST_WINDOW", "900")
)
PASSWORD_RESET_ATTEMPT_LIMIT = int(
    os.getenv("PASSWORD_RESET_ATTEMPT_LIMIT", "10")
)
PASSWORD_RESET_ATTEMPT_WINDOW = int(
    os.getenv("PASSWORD_RESET_ATTEMPT_WINDOW", "900")
)

SESSION_HTTPS_ONLY = (
    os.getenv(
        "SESSION_HTTPS_ONLY",
        "true" if ENVIRONMENT == "production" else "false",
    ).lower()
    == "true"
)
SESSION_SAME_SITE = os.getenv("SESSION_SAME_SITE", "lax")


if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not configured")

if not SECRET_KEY:
    raise ValueError("SECRET_KEY is not configured")

if not GOOGLE_CLIENT_ID:
    raise ValueError("GOOGLE_CLIENT_ID is not configured")

if not GOOGLE_CLIENT_SECRET:
    raise ValueError("GOOGLE_CLIENT_SECRET is not configured")

if PASSWORD_RESET_MINUTES <= 0:
    raise ValueError("PASSWORD_RESET_MINUTES must be greater than 0")

if PASSWORD_RESET_REQUEST_LIMIT <= 0:
    raise ValueError("PASSWORD_RESET_REQUEST_LIMIT must be greater than 0")

if PASSWORD_RESET_ATTEMPT_LIMIT <= 0:
    raise ValueError("PASSWORD_RESET_ATTEMPT_LIMIT must be greater than 0")

if SESSION_SAME_SITE not in {"lax", "strict", "none"}:
    raise ValueError("SESSION_SAME_SITE must be lax, strict, or none")
