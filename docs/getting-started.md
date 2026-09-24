# Getting Started

This guide walks through installing and running **Local AI Workbench V1.1** on Windows.

## Prerequisites

- Windows 10 or Windows 11
- Python 3.10 or later recommended
- Ollama
- A modern browser
- Git, if you want source control
- VS Code, recommended for development

## Verify Ollama

```powershell
ollama --version
ollama list
```

An empty `ollama list` is valid; it simply means that no model has been installed yet.

## Start the application

Run:

```text
run.bat
```

Then open:

```text
http://127.0.0.1:8000
```

The application is intended for local development.

## First-run checks

1. The WebUI loads.
2. The status reports **Ollama connected**.
3. Installed models appear in the selector, or it reports **No models installed**.
4. Model Library opens successfully.

## Install a model

Use **Model Library** or run:

```powershell
ollama pull <model:tag>
```

## Start chatting

Select an installed model, optionally configure the system prompt and temperature, enter a prompt, and submit it. Responses stream through FastAPI from the local Ollama runtime.
