from pathlib import Path

APP_NAME = "OpenCare Analytics"
FEATURE_FLAGS = {
    "EMBEDDED_SUPERSET": True,
    "DASHBOARD_NATIVE_FILTERS": True,
}
TALISMAN_ENABLED = False
HTML_SANITIZATION = True

CUSTOM_THEME_PATH = Path("/app/pythonpath/custom_theme.css")
if CUSTOM_THEME_PATH.exists():
    EXTRA_CSS = CUSTOM_THEME_PATH.read_text()
