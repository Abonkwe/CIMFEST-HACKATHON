# BeatToons 🎵

> A Cameroon-first mobile music challenge Progressive Web App (PWA) built for CIMFEST Hackathon 2026 (Track 2: Music & Entertainment Tech).

---

## Prerequisites

- **Python** (>= 3.12 or 3.14) with [`uv`](https://docs.astral.sh/uv/) installed.
- **Node.js** (>= 18) with `npm` installed.

---

## Running the Application

### 1. Backend (`/backend`)

The backend is built with **FastAPI** and managed with **`uv`**.

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Run the development server (uv will automatically sync dependencies into `.venv`):
   ```bash
   uv run uvicorn main:app --reload --port 8000
   ```
   *Alternative:*
   ```bash
   uv run python main.py
   ```

3. The API will be available at:
   - **Health check:** [http://localhost:8000/health](http://localhost:8000/health)
   - **Interactive docs (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)

---

### 2. Frontend (`/frontend`)

The frontend is built with **React**, **Vite**, **TypeScript**, and **Tailwind CSS**.

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies (if running for the first time):
   ```bash
   npm install
   ```

3. Configure environment variables (a `.env` or `.env.example` file is provided):
   ```bash
   # Already preconfigured with VITE_API_URL=http://localhost:8000
   cp .env.example .env
   ```

4. Start the Vite development server:
   ```bash
   npm run dev
   ```

5. Open your browser at:
   - [http://localhost:5173](http://localhost:5173)

---

## Verifying the Connection

1. Start the backend on port 8000 (`uv run uvicorn main:app --reload --port 8000`).
2. Start the frontend on port 5173 (`npm run dev`).
3. Open [http://localhost:5173](http://localhost:5173) in your mobile browser or responsive device mode (390px–430px width).
4. The screen will query `GET http://localhost:8000/health` and show the green **API Connected** badge.

---

## Project Structure

```text
BeatToons/
├── assets/          # Static assets, character sprites, audio clips
├── backend/         # FastAPI Python backend managed with uv
│   ├── main.py      # Entry point & CORS/health endpoints
│   ├── pyproject.toml
│   └── uv.lock
├── docs/            # SRS and project specifications (read-only)
├── frontend/        # React + Vite + TypeScript + Tailwind CSS PWA
│   ├── src/
│   │   ├── App.tsx  # Mobile-first screen with health connection verification
│   │   └── ...
│   ├── .env.example
│   └── package.json
├── supabase/        # Database migrations, policies & seed data
├── .gitignore       # Root gitignore
└── README.md        # Getting started guide
```

