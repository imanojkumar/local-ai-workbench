# Local AI Workbench V1.2

A local-first single-page chat application using **Vanilla HTML/CSS/JS → FastAPI → Ollama**.

## V1.2
- Persistent multi-conversation chat history stored locally in the browser.
- Sidebar organization with **Pinned**, **Projects**, and **Recent** chats.
- Rename, pin/unpin, move-to-project, and delete actions for saved conversations.
- Project creation, rename, collapse/expand, and safe deletion that returns chats to Recent.
- Search across saved chat titles.
- Automatic migration of the previous single-chat `lai.messages` history into the new workspace store.
- Per-conversation model association while system prompt and temperature remain global settings.
- Safe Markdown rendering for assistant responses with DOMPurify sanitization and code-copy controls.
- Inference lifecycle feedback: Preparing model, Processing prompt, Generating response, TTFT and total elapsed time.
- App-shell scrolling: browser page stays fixed; Chat, Model Library and Settings scroll independently.
- Live search of Ollama's public model catalogue with variant discovery and direct local installation.
- Installed-state detection from local Ollama `/api/tags`; model selector refreshes after installation.

## Run on Windows
1. Ensure Python and Ollama are installed and Ollama is running.
2. Double-click `run.bat`.
3. Open `http://127.0.0.1:8000` (the script opens it automatically).

The pip upgrade notice is informational. V1.2 does not force pip upgrades on startup. Chat history remains browser-local and does not require a database.

## Notes
Ollama does not expose the public website catalogue through the local Ollama API. V1.2 therefore reads public Ollama catalogue/model pages server-side on a best-effort basis. If Ollama changes its public HTML, search/detail parsing may require maintenance. The application never treats unknown-size variants as locally downloadable.

## Documentation & Tutorials

The complete Local AI Workbench tutorial and project documentation are available on GitHub Pages:

**[Open the Local AI Workbench Tutorial →](https://imanojkumar.github.io/local-ai-workbench/)**

The tutorial includes:

- Getting Started
- Using Chat
- Model Library
- Architecture
- Development Guide
- Current Limitations

The source documentation is maintained in the [`docs/`](docs/) folder alongside the application code.
