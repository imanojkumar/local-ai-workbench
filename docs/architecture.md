# Architecture

Local AI Workbench uses a deliberately separated architecture so the
WebUI is not coupled directly to the model runtime.

## High-level architecture

``` text
┌──────────────────────────────────────────────┐
│              Browser WebUI                   │
│       HTML5 + CSS3 + Vanilla JavaScript      │
└─────────────────────┬────────────────────────┘
                      │ HTTP / streaming
                      ▼
┌──────────────────────────────────────────────┐
│                 FastAPI                      │
│       Application/API boundary               │
└─────────────────────┬────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────┐
│              LLM/Ollama Services             │
│   Chat, model discovery, catalogue logic     │
└─────────────────────┬────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────┐
│               Local Ollama                   │
│     model tags / pull / chat-generation      │
└─────────────────────┬────────────────────────┘
                      │
                      ▼
                Local model(s)
```

## Why the browser does not call Ollama directly

A direct browser-to-Ollama implementation would be simpler initially,
but it would couple UI code to the model runtime.

FastAPI provides a stable application boundary for future capabilities
such as:

-   RAG
-   document ingestion
-   vector retrieval
-   citations
-   tools/function calling
-   agent orchestration
-   server-side persistence
-   authentication
-   evaluation and observability
-   model routing
-   alternative providers

## Frontend

The frontend uses:

-   semantic HTML
-   CSS
-   Vanilla JavaScript

There is no React, Vue, Node.js frontend runtime, or frontend build
pipeline in V1.1.

Responsibilities include:

-   application navigation
-   chat rendering
-   streaming-response display
-   model selection
-   Model Library interaction
-   browser-side state/persistence
-   theme and UI behavior

## FastAPI backend

FastAPI provides the HTTP application layer and serves the frontend.

Responsibilities include:

-   health/status endpoints
-   installed-model discovery
-   chat requests
-   streaming responses
-   model catalogue/search requests
-   model installation/pull requests
-   keeping Ollama-specific behavior out of the browser where practical

## Ollama service layer

The Ollama integration encapsulates communication with the local Ollama
runtime.

Typical local operations include:

``` text
/api/tags   → installed models
/api/chat   → model inference/chat
/api/pull   → model installation
```

Keeping these operations behind a service layer makes future refactoring
easier.

## Catalogue service

Ollama's local API does not provide the full public website catalogue as
a local discovery API.

V1.1 therefore separates public catalogue discovery from local
installed-model operations.

This service is best-effort because public website structures can change
independently of the local Ollama API.

## Persistence

V1.1 uses browser-side persistence for current chat/UI state.

It does not yet provide:

-   server-side conversation storage
-   user accounts
-   database-backed sessions
-   cross-device synchronization

## Future architecture

The current structure is intended to evolve without replacing the
UI/backend boundary:

``` text
                       ┌── Local Ollama
                       │
WebUI → FastAPI → LLM ─┼── RAG / Vector Store
                       │
                       ├── Tools
                       │
                       ├── Agent Orchestrator
                       │
                       ├── Evaluation / Telemetry
                       │
                       └── Other model providers
```

These are roadmap directions, not V1.1 features.

## Design principles

1.  **Local-first** --- local inference is the primary runtime.
2.  **Model-agnostic** --- the application should not depend on one LLM
    family.
3.  **Separation of concerns** --- UI, API, services, and model runtime
    remain distinct.
4.  **Progressive extensibility** --- course/research concepts can be
    integrated incrementally.
5.  **No unnecessary frontend framework** --- use a simple stack until
    complexity justifies otherwise.
6.  **Explicit limitations** --- experimental catalogue parsing and
    browser persistence are documented rather than hidden.
