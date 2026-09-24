import re
from urllib.parse import quote
import httpx
from bs4 import BeautifulSoup

BASE = "https://ollama.com"
HEADERS = {"User-Agent": "LocalAIWorkbench/1.1 (+local educational client)"}


def _compact(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def _number(v: str) -> float:
    if not v:
        return 0
    m = re.fullmatch(r"([\d.]+)\s*([KMB]?)", v.replace(",", ""), re.I)
    if not m:
        return 0
    n = float(m.group(1)); unit = m.group(2).upper()
    return n * {"":1,"K":1e3,"M":1e6,"B":1e9}.get(unit, 1)


async def search_models(query: str, local_only: bool = True):
    """Search Ollama's public model catalogue. This is public-page parsing, not a private API."""
    q = _compact(query)[:100]
    url = f"{BASE}/search?q={quote(q)}" if q else f"{BASE}/search"
    async with httpx.AsyncClient(timeout=12, follow_redirects=True, headers=HEADERS) as c:
        r = await c.get(url); r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    out, seen = [], set()
    for a in soup.select('a[href^="/library/"]'):
        href = a.get("href", "").split("?")[0].rstrip("/")
        parts = href.split("/")
        if len(parts) != 3:  # family links only, not nested routes
            continue
        name = parts[-1]
        if not name or name in seen or ":" in name:
            continue
        text = _compact(a.get_text(" ", strip=True))
        if not text:
            continue
        seen.add(name)
        lower = text.lower()
        cloud = bool(re.search(r"\bcloud\b", lower))
        # A cloud badge on a family means it has cloud availability; family detail may still contain local variants.
        # Do not discard the family here: detail filtering removes non-downloadable cloud variants.
        caps = [x for x in ("vision","tools","thinking","embedding","cloud") if re.search(rf"\b{x}\b", lower)]
        nums = re.findall(r"\b\d+(?:\.\d+)?[KMB]\b", text, re.I)
        downloads = nums[-2] if len(nums) >= 2 else (nums[-1] if nums else None)
        variants = None
        vm = re.search(r"\b(\d+)\s+(?:models?|tags?)\b", lower)
        if vm: variants = int(vm.group(1))
        age = None
        am = re.search(r"(\d+\s+(?:minute|hour|day|week|month|year)s?\s+ago)", lower)
        if am: age = am.group(1)
        desc = text
        if desc.lower().startswith(name.lower()): desc = desc[len(name):].strip()
        out.append({"name":name,"description":desc[:360],"capabilities":caps,"downloads":downloads,"downloads_value":_number(downloads),"updated":age,"has_cloud":cloud,"variants":variants,"url":f"{BASE}/library/{name}"})
    out.sort(key=lambda x: x["downloads_value"], reverse=True)
    return out[:40]


async def model_detail(name: str):
    if not re.fullmatch(r"[A-Za-z0-9_.-]+(?:/[A-Za-z0-9_.-]+)?", name):
        raise ValueError("Invalid model name")
    url = f"{BASE}/library/{name}"
    async with httpx.AsyncClient(timeout=12, follow_redirects=True, headers=HEADERS) as c:
        r = await c.get(url); r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    text = _compact(soup.get_text(" ", strip=True))
    # Published Ollama family pages expose rows like: model:tag 14GB · 128K context window · Text · 11 months ago
    pat = re.compile(rf"({re.escape(name)}:[A-Za-z0-9_.-]+)\s+((?:\d+(?:\.\d+)?\s*(?:KB|MB|GB|TB))|-)\s*·\s*([^·]+?)\s+context window\s*·\s*([^·]+?)\s*·\s*(\d+\s+(?:minute|hour|day|week|month|year)s?\s+ago)", re.I)
    variants=[]; seen=set()
    for m in pat.finditer(text):
        tag,size,context,input_type,updated = [_compact(x) for x in m.groups()]
        if tag in seen: continue
        seen.add(tag)
        is_cloud = tag.lower().endswith("-cloud") or size == "-"
        variants.append({"tag":tag,"size":size,"context":context,"input":input_type,"updated":updated,"cloud":is_cloud,"local":not is_cloud})
    # fallback for pages whose markup changes: collect tag-like strings, but never mark unknown-size entries downloadable
    if not variants:
        for s in soup.stripped_strings:
            s=_compact(s)
            if re.fullmatch(rf"{re.escape(name)}:[A-Za-z0-9_.-]+", s) and s not in seen:
                seen.add(s); variants.append({"tag":s,"size":"Unknown","context":"Unknown","input":"Unknown","updated":"Unknown","cloud":s.lower().endswith('-cloud'),"local":False})
    return {"name":name,"url":url,"variants":variants,"local_variants":[v for v in variants if v["local"]]}
