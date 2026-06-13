import os
from typing import Any

import httpx
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse


SERVICE_NAME = "local-ai-gateway"
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://168.119.156.124:11434/v1").rstrip("/")
OLLAMA_ROOT_URL = OLLAMA_BASE_URL.removesuffix("/v1").rstrip("/")
LOCAL_AI_MODEL = os.getenv("LOCAL_AI_MODEL", "llama3.1:8b")
LOCAL_AI_API_KEY = os.getenv("LOCAL_AI_API_KEY", "")
LOCAL_AI_KEEP_ALIVE = os.getenv("LOCAL_AI_KEEP_ALIVE", "24h")
LOCAL_AI_CHAT_API_URL = os.getenv("LOCAL_AI_CHAT_API_URL", "").rstrip("/")
LOCAL_AI_HEALTH_URL = os.getenv("LOCAL_AI_HEALTH_URL", "").rstrip("/")
REQUEST_TIMEOUT_SECONDS = float(os.getenv("LOCAL_AI_REQUEST_TIMEOUT_SECONDS", "180"))

app = FastAPI(
    title="OpenDataLake Local AI Gateway",
    version="0.1.0",
    description="OpenAI-compatible local AI gateway backed only by the configured local model runtime.",
)


def require_api_key(authorization: str | None) -> None:
    if not LOCAL_AI_API_KEY:
        return

    expected = f"Bearer {LOCAL_AI_API_KEY}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="Invalid or missing local AI API key.")


async def post_ollama(path: str, payload: dict[str, Any]) -> httpx.Response:
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
        return await client.post(f"{OLLAMA_BASE_URL}{path}", json=payload)


async def post_chat_app(payload: dict[str, Any]) -> httpx.Response:
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
        return await client.post(LOCAL_AI_CHAT_API_URL, json=payload)


async def get_ollama(path: str) -> httpx.Response:
    async with httpx.AsyncClient(timeout=30) as client:
        return await client.get(f"{OLLAMA_BASE_URL}{path}")


async def warm_model() -> httpx.Response:
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
        if LOCAL_AI_CHAT_API_URL:
            return await client.post(
                LOCAL_AI_CHAT_API_URL,
                json={
                    "model": LOCAL_AI_MODEL,
                    "messages": [{"role": "user", "content": "warm"}],
                },
            )
        return await client.post(
            f"{OLLAMA_ROOT_URL}/api/generate",
            json={"model": LOCAL_AI_MODEL, "prompt": "warm", "stream": False, "keep_alive": LOCAL_AI_KEEP_ALIVE},
        )


@app.get("/")
def root() -> dict[str, str]:
    return {
        "service": SERVICE_NAME,
        "provider": "chat-api" if LOCAL_AI_CHAT_API_URL else "ollama",
        "model": LOCAL_AI_MODEL,
        "docs": "/docs",
    }


@app.get("/health")
async def health() -> JSONResponse:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(LOCAL_AI_HEALTH_URL or f"{OLLAMA_ROOT_URL}/api/tags")
        return JSONResponse(
            {
                "status": "ok" if response.is_success else "degraded",
                "service": SERVICE_NAME,
                "provider": "chat-api" if LOCAL_AI_CHAT_API_URL else "ollama",
                "model": LOCAL_AI_MODEL,
                "keep_alive": LOCAL_AI_KEEP_ALIVE,
                "runtime_status": response.status_code,
                "chat_api_url": LOCAL_AI_CHAT_API_URL or None,
            },
            status_code=200 if response.is_success else 503,
        )
    except httpx.HTTPError as exc:
        return JSONResponse(
            {
                "status": "degraded",
                "service": SERVICE_NAME,
                "provider": "chat-api" if LOCAL_AI_CHAT_API_URL else "ollama",
                "model": LOCAL_AI_MODEL,
                "keep_alive": LOCAL_AI_KEEP_ALIVE,
                "message": str(exc),
            },
            status_code=503,
        )


@app.get("/v1/models")
async def list_models(authorization: str | None = Header(default=None)) -> JSONResponse:
    require_api_key(authorization)
    if LOCAL_AI_CHAT_API_URL:
        return JSONResponse(
            {
                "object": "list",
                "data": [
                    {
                        "id": LOCAL_AI_MODEL,
                        "object": "model",
                        "owned_by": "local-chat-api",
                    }
                ],
            }
        )
    try:
        response = await get_ollama("/models")
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail=f"Local model runtime is unavailable: {exc}") from exc

    return JSONResponse(response.json(), status_code=response.status_code)


@app.post("/v1/warm")
async def warm(authorization: str | None = Header(default=None)) -> JSONResponse:
    require_api_key(authorization)
    try:
        response = await warm_model()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail=f"Local model runtime is unavailable: {exc}") from exc

    return JSONResponse(
        {
            "status": "ready" if response.is_success else "degraded",
            "service": SERVICE_NAME,
            "provider": "chat-api" if LOCAL_AI_CHAT_API_URL else "ollama",
            "model": LOCAL_AI_MODEL,
            "keep_alive": LOCAL_AI_KEEP_ALIVE,
            "runtime_status": response.status_code,
        },
        status_code=200 if response.is_success else 503,
    )


@app.post("/v1/chat/completions")
async def chat_completions(request: Request, authorization: str | None = Header(default=None)) -> JSONResponse:
    require_api_key(authorization)

    try:
        payload = await request.json()
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid JSON request body.") from exc

    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Request body must be a JSON object.")

    if payload.get("stream"):
        raise HTTPException(status_code=400, detail="Streaming responses are not enabled on this gateway yet.")

    payload = {
        **payload,
        "model": payload.get("model") or LOCAL_AI_MODEL,
        "keep_alive": payload.get("keep_alive") or LOCAL_AI_KEEP_ALIVE,
    }

    try:
        if LOCAL_AI_CHAT_API_URL:
            response = await post_chat_app(
                {
                    "model": payload.get("model") or LOCAL_AI_MODEL,
                    "messages": payload.get("messages") or [],
                }
            )
        else:
            response = await post_ollama("/chat/completions", payload)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail=f"Local model runtime is unavailable: {exc}") from exc

    if LOCAL_AI_CHAT_API_URL:
        body = {
            "id": "local-chat-api",
            "object": "chat.completion",
            "model": payload.get("model") or LOCAL_AI_MODEL,
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": response.text,
                    },
                    "finish_reason": "stop",
                }
            ],
        }
    else:
        try:
            body = response.json()
        except ValueError:
            body = {"error": {"message": response.text or "Local model runtime returned a non-JSON response."}}

    return JSONResponse(body, status_code=response.status_code)


@app.post("/v1/embeddings")
async def embeddings(authorization: str | None = Header(default=None)) -> JSONResponse:
    require_api_key(authorization)
    raise HTTPException(status_code=501, detail="Embeddings are not enabled in the local AI gateway yet.")
