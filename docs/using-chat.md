# Using Chat

The Chat page is the main inference interface in Local AI Workbench.

## Before chatting

Confirm that Ollama is running, at least one local model is installed, and the Workbench reports **Ollama connected**.

## Typical flow

1. Select an installed model.
2. Configure the system prompt if required.
3. Adjust temperature if required.
4. Enter a prompt.
5. Submit it.
6. Watch the response stream into the interface.

V1.1 uses browser-oriented persistence for chat/UI state. It does not yet provide a server-side conversation database.
