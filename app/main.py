from pathlib import Path
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from .services import ollama_service as ollama
from .services.catalog_service import search_models, model_detail

ROOT=Path(__file__).resolve().parents[1]
app=FastAPI(title="Local AI Workbench", version="1.2.0")
app.mount("/static", StaticFiles(directory=ROOT/"frontend"), name="static")

class ChatIn(BaseModel):
    model:str; messages:list[dict]; system:str=""; temperature:float=0.7
class PullIn(BaseModel): name:str

@app.get("/")
async def home(): return FileResponse(ROOT/"frontend/index.html")
@app.get("/api/health")
async def health(): return {"app":True,"version":"1.2.0","ollama":await ollama.health()}
@app.get("/api/models")
async def get_models():
    try:return {"models":await ollama.models()}
    except Exception:return {"models":[],"error":"Ollama is not reachable."}
@app.get("/api/catalog/search")
async def catalog_search(q:str=Query("",max_length=100)):
    try:return {"models":await search_models(q),"source":"Ollama public model catalogue"}
    except Exception as e: raise HTTPException(502,f"Could not search Ollama catalogue: {e}")
@app.get("/api/catalog/model/{name:path}")
async def catalog_model(name:str):
    try:return await model_detail(name)
    except ValueError as e: raise HTTPException(400,str(e))
    except Exception as e: raise HTTPException(502,f"Could not read Ollama model details: {e}")
@app.post("/api/chat")
async def chat(x:ChatIn):
    if not await ollama.health(): raise HTTPException(503,"Ollama is not reachable")
    return StreamingResponse(ollama.chat_stream(x.model_dump()), media_type="text/plain")
@app.post("/api/pull")
async def pull(x:PullIn):
    if not await ollama.health(): raise HTTPException(503,"Ollama is not reachable")
    return StreamingResponse(ollama.pull_stream(x.name), media_type="application/x-ndjson")
