# Getting Started

This guide walks through installing and running **Local AI Workbench
V1.1** on a Windows computer.

## What Local AI Workbench is

Local AI Workbench is a local-first browser interface for experimenting
with open-source language models through Ollama. The current
architecture is:

``` text
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

The browser does not communicate directly with Ollama. FastAPI provides
an application boundary that can later support RAG, tools, agents,
persistence, evaluation, and other model providers.

## Prerequisites

Install the following before starting:

-   Windows 10 or Windows 11
-   Python 3.10 or later recommended
-   Ollama
-   A modern browser such as Firefox, Chrome, or Edge
-   Git, if you want source control
-   VS Code, recommended for development

The Workbench itself is lightweight. The model you choose determines
most RAM, VRAM, and disk requirements.

## Verify Ollama

Open Command Prompt or PowerShell:

``` powershell
ollama --version
ollama list
```

An empty `ollama list` is valid; it simply means that no model has been
installed yet.

## Get the project

Clone the repository:

``` powershell
git clone https://github.com/imanojkumar/local-ai-workbench.git
cd local-ai-workbench
```

Alternatively, download the repository as a ZIP and extract it.

## Start the application

On Windows, double-click:

``` text
run.bat
```

or run it from a terminal.

The launcher creates or reuses the Python virtual environment, installs
required Python packages, starts FastAPI/Uvicorn, and opens the
application.

The default local address is:

``` text
http://127.0.0.1:8000
```

> The application is intended for local development. Do not expose the
> development server directly to the public internet.

## First-run checks

A healthy first run should show:

1.  The WebUI loads in the browser.
2.  The lower-left status reports **Ollama connected**.
3.  The model selector shows installed Ollama models, or **No models
    installed**.
4.  Model Library opens successfully.

If no model is installed, that is not an application error.

## Install your first model

Open **Model Library** and search for a model family. Inspect the
available tags/variants and download sizes before choosing one.

You can also install a model from a terminal:

``` powershell
ollama pull <model:tag>
```

After installation, refresh the Workbench model list if necessary.

## Start a chat

1.  Open **Chat**.
2.  Select an installed model.
3.  Optionally configure the system prompt and temperature in
    **Settings**.
4.  Enter a message.
5.  The response is streamed from the locally running Ollama model
    through FastAPI.

### Note

Your first prompt may be considerably slower than later prompts while Ollama loads the selected model into memory. Do not immediately terminate the application if no text appears.

## Hardware guidance

There is no single minimum GPU specification for all models.
Requirements depend on the selected model and quantization.

A practical baseline is:

-   64-bit CPU
-   8 GB RAM for the application and very small models
-   16 GB+ RAM recommended for more useful local experimentation
-   SSD space sufficient for the model artifacts
-   A supported GPU is desirable for faster inference

Always check the actual artifact size and model requirements before
downloading a large model.

## Next steps

Continue with:

-   [Model Library](model-library.md)
-   [Using Chat](using-chat.md)
-   [Architecture](architecture.md)
-   [Development Guide](development.md)
-   [Limitations](limitations.md)
