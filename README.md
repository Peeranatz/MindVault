# MindVault

MindVault is a mental wellness journaling web app powered by AI. It is designed as a safe space where users can write daily thoughts, receive empathetic responses, and get grounded self-care guidance supported by a lightweight RAG knowledge flow.

This project includes:
- A Next.js frontend for user and doctor experiences
- A FastAPI backend for auth, journaling, MBTI, doctor workflows, and RAG retrieval
- SQLite for local development
- Gemini integration for response generation and clinical-style summaries

## 1. What This Project Does

MindVault supports two main roles:
- User:
  - Register/login
  - Complete MBTI assessment
  - Write journal entries and receive AI responses
  - See RAG source snippets used to ground suggestions
- Doctor:
  - Connect with patients (manual + QR invite flow)
  - View patient list and search
  - Open patient profile page with summary stats and AI-generated clinical-style overview

Core features:
- MBTI-aware response tone
- Mood estimation and basic cognitive distortion labeling
- Crisis phrase detection with hotline guidance
- RAG source popup with readable Thai-friendly references
- Doctor invite token + QR registration flow

## 2. Tech Stack

Frontend:
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Axios
- qrcode.react

Backend:
- FastAPI
- SQLAlchemy
- Pydantic v2
- python-jose (JWT)
- bcrypt/passlib
- google-generativeai

Database:
- SQLite (default local)

## 3. Repository Layout

Top-level structure:

- `backend/`
  - API routes (`auth`, `journal`, `doctor`, `connect`, `mbti`)
  - Core services (`llm_engine`, `rag_service`, `mbti_logic`)
  - Database setup and ORM models
- `frontend/`
  - App routes for auth/user/doctor
  - Shared components (toast/loading/nav/RAG popup)
  - Axios API client
- `chunking_sky.txt`
  - Chunked knowledge file used by RAG retriever
- `run.bat`
  - Starts backend and frontend on Windows
- `start_backend.bat` / `start_frontend.bat`
  - Service-level startup scripts

## 4. Prerequisites

Install before running:
- Git
- Python 3.10+ (3.11 recommended)
- Node.js 18+ (or 20 LTS)

Windows note:
- If `git` is not found in terminal, reopen terminal after Git install or add Git to PATH.
- If `npm` is not found, ensure Node.js install path is available in PATH.

## 5. Quick Start (Windows, Easiest)

1. Clone repository:

```bash
git clone https://github.com/Peeranatz/MindVault.git
cd MindVault
```

2. Backend setup:

```bash
cd backend
python -m venv venv
venv\Scripts\pip install -r requirements.txt
cd ..
```

3. Frontend setup:

```bash
cd frontend
npm install
cd ..
```

4. Create backend environment file at `backend/.env`:

```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
SECRET_KEY=YOUR_STRONG_RANDOM_SECRET
DATABASE_URL=sqlite:///./app.db
JWT_EXPIRE_MINUTES=60
APP_ENV=development
```

Notes:
- `SECRET_KEY` should be unique and private.
- `DATABASE_URL` can stay as SQLite for local development.

5. Start everything:

```bash
run.bat
```

After startup:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8001`
- API Docs: `http://localhost:8001/docs`

## 6. Manual Start (Alternative)

Backend terminal:

```bash
cd backend
venv\Scripts\python.exe -m uvicorn backend.main:app --port 8001 --reload
```

Frontend terminal:

```bash
cd frontend
npm run dev
```

## 7. Environment Variables

Primary variables used by backend:

- `GEMINI_API_KEY`
  - Required for Gemini-based text generation and summary features
- `SECRET_KEY`
  - JWT signing key
- `DATABASE_URL`
  - Defaults to `sqlite:///./app.db`
- `JWT_EXPIRE_MINUTES`
  - Access token expiry (default `60`)
- `APP_ENV`
  - Optional app environment hint
- `GEN_LANG_CLIENT`
  - Legacy fallback key field (optional)

Security:
- Never commit real API keys.
- `backend/.env` is ignored by git.

## 8. API Overview

Auth:
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

Journal:
- `POST /journal`
- `GET /journal`

MBTI:
- `POST /mbti/analyze`

Doctor:
- `POST /doctor/connect`
- `GET /doctor/patients`
- `GET /doctor/patients/{patient_id}/summary`
- `GET /doctor/patients/{patient_id}/profile`
- `POST /doctor/invite`
- `GET /doctor/invite/{token}`

Connection workflow:
- `GET /connect/requests`
- `POST /connect/handle`

Health:
- `GET /health`

## 9. RAG Knowledge Setup

MindVault RAG retriever looks for knowledge files in this order:
1. `chunking_sky.txt`
2. `knowledge_base.txt`

Supported formats:
- JSON with `knowledge_chunks` array (recommended)
- Plain text paragraphs (fallback split by blank lines)

Recommended JSON shape:

```json
{
  "knowledge_chunks": [
    {
      "chunk_id": "breathing_001",
      "topic": "เทคนิคการหายใจ",
      "content": "หายใจเข้าช้าๆ 1-4 กลั้น 1-4 ผ่อนออก 1-8"
    }
  ]
}
```

RAG behavior:
- Scores by Thai/English token overlap and char n-gram similarity
- Prioritizes actionable guidance topics
- Returns concise Thai-friendly bullet snippets in the UI popup

## 10. Testing Checklist

Use this checklist after setup:

1. Auth and role flow:
- Register a user account and a doctor account
- Login both successfully

2. User flow:
- Complete MBTI
- Submit journal text
- Verify AI response appears
- Click RAG source button and verify references are readable

3. Doctor flow:
- Generate doctor QR invite
- Register user with invite token
- Confirm patient appears in doctor dashboard
- Open patient profile route and verify summary data

4. Reliability checks:
- Restart backend and frontend
- Verify app still works with same `.env`

## 11. Troubleshooting

### A. `401 Unauthorized` on frontend requests
Possible causes:
- Expired/invalid token in browser localStorage
- Backend restarted with different auth state

Fix:
- Logout/login again
- Clear localStorage token and re-authenticate

### B. RAG popup shows no references
Possible causes:
- Knowledge file is empty
- Query does not match any chunk strongly

Fix:
- Ensure `chunking_sky.txt` has valid content
- Use prompt with clear keywords related to your KB topics

### C. `git` command not found on Windows
Fix:
- Install Git for Windows
- Reopen terminal
- Or use full path: `C:\Program Files\Git\cmd\git.exe`

### D. Frontend style or static asset issues
Fix:
- Stop duplicate dev servers
- Restart `npm run dev`
- Clear `.next` if needed

## 12. Git Workflow Recommendation

Before push:
- Ensure secrets are not in tracked files
- Keep `.env` local only
- Avoid committing local runtime files

Current ignore policy includes:
- `.env` files
- runtime logs
- Python caches
- Node build artifacts
- local backend runtime output files

## 13. Notes for Future Contributors

If you continue development, suggested next enhancements:
- Add automated tests for API routes
- Add migrations (Alembic) instead of auto table creation
- Improve role-based route guards and error UX
- Add observability logs for LLM/RAG decision traces
- Replace deprecated `google-generativeai` SDK with newer official client when ready

## 14. Disclaimer

MindVault is a supportive journaling assistant, not a medical diagnosis tool. For immediate self-harm risk or mental health crisis, contact local emergency services or mental health hotlines (Thailand: 1323).

---

Built for practical mental wellness support and transparent AI-assisted journaling.
