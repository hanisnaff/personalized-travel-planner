# Personalized Travel Itinerary Planner

A responsive React + Vite frontend and FastAPI backend for creating, editing, exporting, and saving personalized travel itineraries. It works in demo mode without AI credentials and uses SQLite locally by default. Optional OpenAI-compatible AI generation and Supabase storage can be enabled with environment variables.

## Features

- Trip form: destination, date, duration, budget/currency, travelers, interests, travel style, and accommodation preference.
- Day-by-day itinerary with editable activities, descriptions, and estimated costs.
- Regeneration, delete-activity, export-to-text, and saved trip management.
- Explicit demo-mode labeling and a disclaimer that demo content is not live-verified research.
- FastAPI validation and helpful errors, SQLite persistence, optional Supabase REST storage.
- Responsive layout for desktop and mobile.

## Requirements

- Python 3.11+ recommended
- Node.js 20+ LTS and npm
- Git (optional, for version control)

## Run on Windows

Open two terminals in the project directory.

### 1. Backend

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

If PowerShell blocks activation, use `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` in that terminal, then activate again. Alternatively, run `.venv\Scripts\python.exe -m pip install -r requirements.txt` and `.venv\Scripts\python.exe -m uvicorn app.main:app --reload` without activation.

API docs: http://localhost:8000/docs
Health check: http://localhost:8000/api/health

### 2. Frontend

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Open the Vite URL printed in the terminal (normally http://localhost:5173).

## AI configuration (optional)

Edit `backend/.env` and set:

```dotenv
AI_API_KEY=your_api_key_here
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
```

The configured endpoint must support an OpenAI-compatible `/chat/completions` API and JSON response mode. Restart FastAPI after changing environment variables. Do not put this key in frontend environment variables or commit `.env`. If the key is missing or the provider fails, the backend returns a clearly labeled demo itinerary.

## Supabase configuration (optional)

1. Create a Supabase project.
2. Open SQL Editor and run `backend/sql/supabase_schema.sql`.
3. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `backend/.env`.
4. Restart the backend. When both variables are present, the backend uses Supabase REST; otherwise, it uses SQLite.

**Security:** the service-role key bypasses row-level security. Keep it only in the backend environment, never in React. Before deploying for multiple real users, add authentication and user-scoped authorization/policies; this starter app does not provide user accounts.

## Testing and build

Backend tests (from `backend`):

```powershell
python -m pytest -q
```

Frontend production build (from `frontend`):

```powershell
npm run build
```

## Git and GitHub

From the project root:

```powershell
git status
git add .gitignore README.md backend frontend
git commit -m "Build personalized travel itinerary planner"
```

If no remote exists, create an empty repository on GitHub, then run (replace the URL with your own):

```powershell
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git branch -M main
git push -u origin main
```

If the workspace already has a Git repository or remote, inspect `git status` and `git remote -v` before committing/pushing. Never force-push or commit secrets.

## Notes and limitations

- Demo content is illustrative and is not live travel research; verify attraction hours, current prices, availability, and transport before booking.
- Budget estimates summarize activity estimates only and may exclude lodging and transport.
- AI-generated output falls back to demo mode if a provider is unavailable or returns invalid data.
- Supabase schema and REST integration are included; authentication and multi-user isolation are intentionally outside this beginner-friendly starter scope.
