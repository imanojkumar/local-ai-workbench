# Development Guide

This guide covers the basic local development and Git workflow for Local
AI Workbench.

## Open the project in VS Code

From Command Prompt:

``` powershell
cd /d D:\Ollama_AI_Workbench
code .
```

Or open VS Code and choose **File → Open Folder**.

The repository root---not an individual subfolder---should be the VS
Code workspace.

## Virtual environment

The project uses a Python virtual environment.

On Windows:

``` powershell
.venv\Scripts\activate
```

The prompt should then show `(.venv)`.

Activating the virtual environment is useful for Python commands but is
not required for Git commands.

## Install dependencies

With the environment activated:

``` powershell
python -m pip install -r requirements.txt
```

The launcher can also manage the normal startup path.

A pip upgrade notification is informational. Do not automatically
upgrade pip on every application launch unless there is a specific
reason.

## Run locally

Use:

``` text
run.bat
```

or the equivalent Uvicorn command used by the project.

Then open:

``` text
http://127.0.0.1:8000
```

## Recommended development cycle

``` text
Create/choose an issue or task
          ↓
Edit code
          ↓
Run locally
          ↓
Test the affected workflow
          ↓
Review git diff
          ↓
Stage only intended files
          ↓
Commit
          ↓
Push
```

## Git status

Before every commit:

``` powershell
git status
```

Make sure `.venv`, secrets, caches, downloaded model files, and
unrelated artifacts are not staged.

## Review changes

Useful commands:

``` powershell
git diff
git diff --staged
```

VS Code Source Control also provides a visual diff.

## Commit

Example:

``` powershell
git add .
git commit -m "Improve Ollama model search"
git push
```

Prefer focused commit messages describing one coherent change.

Examples:

``` text
Fix Model Library scrolling
Improve Ollama variant filtering
Add project documentation
Add RAG document ingestion
Add backend tests for model discovery
```

## Version tags

Known-good milestones can be tagged:

``` powershell
git tag -a v1.1 -m "Local AI Workbench V1.1"
git push origin v1.1
```

Future accepted milestones can use new semantic-style tags such as
`v1.2`.

A tag should identify a known repository state; it should not be moved
casually after publication.

## Branches

For small documentation fixes, working directly on `main` may be
acceptable for a personal project.

As changes become larger, use feature branches:

``` powershell
git switch -c feature/rag-ingestion
```

After development and testing, merge through a pull request or a
controlled local merge.

## `.gitignore`

Do not commit machine-specific or secret material.

Typical exclusions include:

``` gitignore
.venv/
venv/
__pycache__/
*.pyc
.env
.env.*
!.env.example
.vscode/
*.log
Thumbs.db
.DS_Store
```

Never commit API keys, passwords, access tokens, private credentials, or
sensitive documents.

## Markdown documentation

Documentation lives under `docs/`.

Use lowercase kebab-case filenames:

``` text
getting-started.md
model-library.md
using-chat.md
```

Preview Markdown in VS Code with:

``` text
Ctrl + Shift + V
```

## Screenshot assets

Store documentation screenshots in:

``` text
docs/images/
```

Use lowercase kebab-case names, for example:

``` text
chat-home.png
model-library-search.png
model-library-variants.png
```

Avoid spaces, dates in ad-hoc formats, uppercase/lowercase
inconsistencies, and names such as `Screenshot (23).png`.

## Before pushing

Run:

``` powershell
git status
git diff --staged
```

Then commit and push.

## Future engineering improvements

As the project grows, consider adding:

-   automated tests
-   linting/formatting
-   typed configuration
-   structured logging
-   API schemas
-   CI checks
-   release notes/changelog
-   feature branches and pull requests
-   security review before any non-local deployment

## Planned UX enhancement

Expose inference lifecycle states such as Loading model, Processing prompt, and Generating, together with time-to-first-token/elapsed-time indicators, so users can distinguish cold-start latency from a stalled request.