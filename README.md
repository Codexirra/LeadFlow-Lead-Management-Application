# LeadFlow - Lead Management Application

A complete lead management applicationbuilt with **Codexirra**, using a React, Vite, TypeScript frontend, a FastAPI backend, and Postgres database.

This template was generated with [Codexirra](https://codexirra.com), an AI development workspace for building real web applications. Codexirra helps you generate, edit, preview, debug, and refine full-stack web apps from simple prompts.

> Want to build your own CRM, dashboard, portal, or SaaS app?  
> Try Codexirra: [https://codexirra.com](https://codexirra.com)

---

## Built with Codexirra

This project is an example of what can be created using Codexirra.

Codexirra can help generate complete web applications with:

- Frontend pages and components
- Backend API routes
- Database-aware app logic
- Clean SaaS-style UI layouts
- Forms, tables, dashboards, filters, and detail pages
- Full project structure
- Editable code and live preview

LeadFlow CRM is designed as a practical business application template for managing leads, contacts, follow-ups, notes, pipeline stages, and sales activity.

---

## What this app does

LeadFlow CRM is a complete lead management web application for tracking leads, statuses, contacts, notes, follow-ups, and pipeline activity.

It uses a modern SaaS sidebar layout with dashboard analytics, searchable tables, forms, filters, and lead detail workspaces.

---

## Tech stack

- React
- Vite
- TypeScript
- Python
- FastAPI
- Postgres

---

## Features

- Dashboard cards for total leads, open pipeline value, weighted forecast, and overdue follow-ups
- Pipeline breakdown by stage and status
- Recent activity feed and upcoming follow-up queue
- Leads table with search and filters for status, stage, priority, and source
- Lead creation workflow with validation
- Lead detail page with editable status, stage, owner, priority, value, and close date
- Contact management per lead
- Notes with author and timestamp
- Follow-up scheduling and completion
- Automatic pipeline activity logging
- Realistic seed data on first startup

---

## Running the frontend

```bash
npm install
npm run dev
```

The frontend API client reads the backend URL from `VITE_API_URL` or `VITE_API_BASE_URL`. If neither is set, it falls back to same-origin `/api`, which works with preview/runtime proxying. If a configured URL is only an origin, the client automatically appends `/api` so requests still hit the FastAPI routes.

For local Vite development, same-origin `/api` requests can be proxied to the FastAPI backend by setting `VITE_API_PROXY_TARGET` for the Vite process, for example `VITE_API_PROXY_TARGET=http://127.0.0.1:8000 npm run dev`. The project does not hardcode a localhost proxy target so preview routing can connect the frontend and backend correctly.

## Running the backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
# Either entrypoint works from /backend:
uvicorn app.main:app --reload
# or
uvicorn main:app --reload
```

The backend exports the FastAPI application as `app` from both `/backend/app/main.py` and `/backend/main.py` for compatibility with different Uvicorn runners. It initializes the Postgres schema when the API is reached and seeds sample business leads when the `leads` table is empty.

## Troubleshooting API connectivity

If the UI reports that `/api` returned the frontend HTML instead of backend JSON, verify these in order:

1. Start the FastAPI backend and confirm `GET /api/health` returns JSON.
   You can also confirm `GET /api` returns `{ "service": "LeadFlow CRM API", "status": "online" }`.
2. Ensure `DATABASE_URL` is set to a reachable Postgres database for the backend process.
3. In local Vite development, confirm `/api` is proxied to the backend or set `VITE_API_PROXY_TARGET` for the Vite process.
4. Do not set `VITE_API_URL` or `VITE_API_BASE_URL` to the frontend origin; leave them unset for same-origin `/api` preview routing. If you are running locally and need Vite to proxy API calls, set `VITE_API_PROXY_TARGET` instead.

The backend now stays online if Postgres is not ready at startup and returns JSON health/degraded responses instead of crashing during startup.

## API overview

All application routes are under `/api`:

- `GET /api`
- `GET /api/health`
- `GET /api/dashboard`
- `GET /api/leads`
- `POST /api/leads`
- `GET /api/leads/{lead_id}`
- `PATCH /api/leads/{lead_id}`
- `POST /api/leads/{lead_id}/contacts`
- `POST /api/leads/{lead_id}/notes`
- `POST /api/leads/{lead_id}/follow-ups`
- `PATCH /api/leads/{lead_id}/follow-ups/{follow_up_id}/complete`

## Environment

Create a local backend env file from `/backend/.env.example` if desired. The app calls `load_dotenv(override=False)`, so platform-provided environment variables are not overwritten at runtime.
