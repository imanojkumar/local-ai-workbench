import json, os
import httpx

BASE = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")

async def health():
    try:
        async with httpx.AsyncClient(timeout=3) as c:
            r = await c.get(f"{BASE}/api/tags")
            r.raise_for_status()
            return True
    except Exception:
        return False

async def models():
    async with httpx.AsyncClient(timeout=8) as c:
        r = await c.get(f"{BASE}/api/tags")
        r.raise_for_status()
        return r.json().get("models", [])

async def chat_stream(payload):
    body = {
        "model": payload["model"], "messages": payload["messages"], "stream": True,
        "options": {"temperature": payload.get("temperature", 0.7)}
    }
    if payload.get("system"):
        body["messages"] = [{"role":"system","content":payload["system"]}] + body["messages"]
    async with httpx.AsyncClient(timeout=None) as c:
        async with c.stream("POST", f"{BASE}/api/chat", json=body) as r:
            r.raise_for_status()
            async for line in r.aiter_lines():
                if line:
                    obj=json.loads(line)
                    if obj.get("message",{}).get("content"):
                        yield obj["message"]["content"]

async def pull_stream(name):
    async with httpx.AsyncClient(timeout=None) as c:
        async with c.stream("POST", f"{BASE}/api/pull", json={"name":name,"stream":True}) as r:
            r.raise_for_status()
            async for line in r.aiter_lines():
                if line: yield line
