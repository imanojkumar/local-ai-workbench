# Development Guide

Open the repository root in VS Code:

```powershell
cd /d D:\Ollama_AI_Workbench
code .
```

Typical development cycle:

```text
Edit → Run locally → Test → Review diff → Stage → Commit → Push
```

Useful commands:

```powershell
git status
git diff
git add .
git commit -m "Describe the change"
git push
```

Keep secrets, `.env`, `.venv`, caches, and downloaded model files out of Git.
