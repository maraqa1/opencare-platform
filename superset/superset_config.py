import os
from pathlib import Path

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

CUSTOM_THEME_PATH = Path("/app/pythonpath/custom_theme.css")
if CUSTOM_THEME_PATH.exists():
    EXTRA_CSS = CUSTOM_THEME_PATH.read_text()
