"""Compatibility entrypoint for FastAPI runners.

The primary application lives in backend/app/main.py and exports `app`.
Some preview/runtime environments start Uvicorn from /backend with
`main:app`, so this module re-exports the same FastAPI instance.
"""

from app.main import app

__all__ = ["app"]
