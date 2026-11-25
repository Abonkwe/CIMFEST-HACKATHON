# CamVibe 🎵

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
   uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
   *Alternative:*
   ```bash
   uv run python main.py
   ```
   *(Listening on `0.0.0.0` allows your mobile phone and other devices on the same Wi-Fi network to connect).*

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

## Verifying the Connection (Desktop & Mobile Phone)

### On Your Computer
1. Start the backend on all network interfaces:
   ```bash
   cd backend
   uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
2. In another terminal, start the frontend dev server:
   ```bash
   cd frontend
   npm run dev
   ```
3. Open on your computer at:
   - [http://localhost:5173](http://localhost:5173)

### On Your Mobile Phone (Same Wi-Fi)
1. Make sure your phone is connected to the same Wi-Fi network as your computer.
2. Vite will display your Network IP in the terminal (e.g. `http://192.168.1.33:5173`).
3. Open that address in your mobile phone's browser (e.g., Safari or Chrome):
   ```
   http://192.168.1.33:5173
   ```
4. The frontend will automatically route API requests to your computer's IP (`http://192.168.1.33:8000/health`) and show the green **API Connected** badge right on your phone!

---

## Project Structure

```text
CamVibe/
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

