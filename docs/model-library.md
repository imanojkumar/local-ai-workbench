# Model Library

The **Model Library** provides a browser-based workflow for discovering and installing models for the local Ollama runtime.

## Workflow

```text
Search model family
       ↓
Inspect matching result
       ↓
Discover tags / variants
       ↓
Check published size and metadata
       ↓
Choose a locally downloadable variant
       ↓
Download through local Ollama
       ↓
Model becomes available in Chat
```

V1.2 performs best-effort public catalogue discovery and uses local Ollama APIs for installed-state detection and model pulls.
