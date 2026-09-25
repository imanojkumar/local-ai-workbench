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

V1.2 stores multiple conversations in browser-local storage and presents them in the sidebar as **Pinned**, **Projects**, and **Recent** chats. You can rename, pin/unpin, move, and delete conversations, and create projects to group related work. The selected model is associated with each conversation. System prompt and temperature remain global settings.

The Workbench also shows local-inference lifecycle feedback such as **Preparing model**, **Processing prompt**, **Generating response**, time to first token (TTFT), and total elapsed time. A long first response can be normal cold-start/model-loading latency while Ollama loads model weights into RAM and/or GPU VRAM. Subsequent prompts are often faster while the model remains warm.

Conversation history is browser-local; V1.2 still does not provide a server-side conversation database or synchronization across browsers/devices.
