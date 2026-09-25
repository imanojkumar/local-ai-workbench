# Limitations

Local AI Workbench V1.2 is a local-first engineering foundation, not a production multi-user AI platform.

Current limitations include:

- single-user/local-development focus
- no authentication or authorization
- browser-oriented persistence
- no RAG pipeline yet
- no general agent framework yet
- no integrated fine-tuning workflow
- best-effort public Ollama catalogue parsing
- hardware requirements vary by model
- model outputs can hallucinate or be incorrect

Do not expose the local development service directly to the public internet without production-grade security controls.


## Browser-local conversation history

V1.2 supports multiple saved chats, pinned chats, and project grouping, but this workspace is stored in the current browser's local storage. It is not a multi-user database, does not synchronize between devices or browsers, and can be lost if browser site data is cleared.

## Local inference latency

Response speed depends on model size and hardware. A long wait before the first token does not necessarily indicate application failure. Large models can have substantial cold-start latency while weights are loaded into RAM/VRAM. The V1.2 lifecycle/TTFT display is client-observed timing; it is not yet Ollama's exact internal load/evaluation telemetry.
