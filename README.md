# Local AI Workbench V1.1

A local-first single-page chat application using **Vanilla HTML/CSS/JS → FastAPI → Ollama**.

## V1.1
- App-shell scrolling: browser page stays fixed; Chat, Model Library and Settings scroll independently.
- Live search of Ollama's public model catalogue.
- Family detail/variant discovery from Ollama model pages.
- Published download size, context window, input type and update age per detected variant.
- Local-only filter excludes `-cloud` / non-downloadable variants.
- Popularity/download metadata from Ollama search results when available.
- Direct installation through the local Ollama `/api/pull` endpoint with progress.
- Installed-state detection from local Ollama `/api/tags`.
- Model selector refreshes after installation.

## Run on Windows
1. Ensure Python and Ollama are installed and Ollama is running.
2. Double-click `run.bat`.
3. Open `http://127.0.0.1:8000` (the script opens it automatically).

The pip upgrade notice is informational. V1.1 does not force pip upgrades on startup.

## Notes
Ollama does not expose the public website catalogue through the local Ollama API. V1.1 therefore reads public Ollama catalogue/model pages server-side on a best-effort basis. If Ollama changes its public HTML, search/detail parsing may require maintenance. The application never treats unknown-size variants as locally downloadable.
