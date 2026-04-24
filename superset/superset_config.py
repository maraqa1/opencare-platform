import os
from pathlib import Path
from urllib.parse import quote

APP_NAME = "OpenCare Analytics"
FEATURE_FLAGS = {
    "EMBEDDED_SUPERSET": True,
    "DASHBOARD_NATIVE_FILTERS": True,
}
TALISMAN_ENABLED = False
HTML_SANITIZATION = True
ENABLE_PROXY_FIX = True

_portal_host = os.getenv("PORTAL_HOST", "opencare.opendatalake.com")
_analytics_url = os.getenv("SUPERSET_EMBED_URL", "")
_secure_embed = _analytics_url.startswith("https://")

PREFERRED_URL_SCHEME = "https" if _secure_embed else "http"
SESSION_COOKIE_SECURE = _secure_embed
SESSION_COOKIE_SAMESITE = "None" if _secure_embed else "Lax"

# The portal intentionally embeds Superset in the Analysis tab. Superset's
# default SAMEORIGIN frame header blocks that once the app uses subdomains.
HTTP_HEADERS = {"X-Frame-Options": "ALLOWALL"}
ENABLE_CORS = True
CORS_OPTIONS = {
    "supports_credentials": True,
    "origins": [
        f"https://{_portal_host}",
        f"http://{_portal_host}",
    ],
}


def _superset_metadata_uri() -> str:
    configured_uri = os.getenv("SUPERSET_METADATA_DB_URI", "").strip()
    if configured_uri:
        return configured_uri.replace("postgresql://", "postgresql+psycopg2://", 1)

    user = quote(os.getenv("POSTGRES_USER", "opencare"), safe="")
    password = quote(os.getenv("POSTGRES_PASSWORD", ""), safe="")
    host = os.getenv("POSTGRES_HOST", "postgres")
    port = os.getenv("POSTGRES_PORT", "5432")
    database = os.getenv("POSTGRES_DB", "opencare")
    credentials = user if not password else f"{user}:{password}"
    return f"postgresql+psycopg2://{credentials}@{host}:{port}/{database}"


SQLALCHEMY_DATABASE_URI = _superset_metadata_uri()

CUSTOM_THEME_PATH = Path("/app/pythonpath/custom_theme.css")
if CUSTOM_THEME_PATH.exists():
    EXTRA_CSS = CUSTOM_THEME_PATH.read_text()
