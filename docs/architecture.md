# Architecture

Local AI Workbench deliberately separates the browser UI from the local model runtime.

```text
Vanilla HTML/CSS/JavaScript
            ↓
          FastAPI
            ↓
        LLM Service
            ↓
       Ollama Service
            ↓
          Ollama
            ↓
       Local LLM
```

The FastAPI boundary makes future RAG, tools, agents, persistence, evaluation, and additional model-provider integrations easier to add without coupling the browser directly to Ollama.
