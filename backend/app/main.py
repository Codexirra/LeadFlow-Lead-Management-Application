import logging
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .database import execute, fetch_all, fetch_one, init_schema, seed_data
from .schemas import (
    Contact,
    ContactCreate,
    DashboardData,
    FollowUp,
    FollowUpCreate,
    LeadCreate,
    LeadDetail,
    LeadSummary,
    LeadUpdate,
    Note,
    NoteCreate,
)

app = FastAPI(title="LeadFlow CRM API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

LEAD_SELECT = """
SELECT
  l.*,
  (SELECT MAX(a.created_at) FROM activities a WHERE a.lead_id = l.id) AS last_activity_at,
  (SELECT MIN(f.due_at) FROM follow_ups f WHERE f.lead_id = l.id AND f.status = 'Open') AS next_follow_up_at
FROM leads l
"""

logger = logging.getLogger(__name__)
_database_ready = False
_database_error: Optional[str] = None


def ensure_database_ready() -> None:
    """Initialize Postgres schema/seed data lazily and keep failures as JSON API errors.

    Preview environments may start the web process before Postgres is reachable. Raising
    during FastAPI startup can make /api requests fall through to the frontend server,
    which is why the UI can receive index.html instead of JSON. This helper lets the
    backend process stay alive and retries initialization on subsequent API requests.
    """
    global _database_ready, _database_error
    if _database_ready:
        return

    try:
        init_schema()
        seed_data()
        _database_ready = True
        _database_error = None
    except Exception as exc:
        _database_ready = False
        _database_error = str(exc)
        logger.warning("Database is not ready: %s", _database_error)
        raise HTTPException(status_code=503, detail=f"Database unavailable: {_database_error}") from exc


@app.on_event("startup")
def startup() -> None:
    try:
        ensure_database_ready()
    except HTTPException as exc:
        logger.warning("Starting API before database is ready: %s", exc.detail)


@app.middleware("http")
async def database_guard(request: Request, call_next):
    if request.url.path.startswith("/api") and request.url.path not in {"/api", "/api/health"}:
        try:
            ensure_database_ready()
        except HTTPException as exc:
            return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    return await call_next(request)


@app.get("/api")
def api_root() -> Dict[str, str]:
    return {"service": "LeadFlow CRM API", "status": "online"}


@app.get("/api/health")
def health() -> Dict[str, str]:
    try:
        ensure_database_ready()
    except HTTPException as exc:
        return {"status": "degraded", "database": "unavailable", "detail": str(exc.detail)}
    return {"status": "ok", "database": "ready"}


def add_activity(lead_id: int, kind: str, description: str, actor: str = "Sales Team") -> None:
    execute(
        "INSERT INTO activities (lead_id, kind, description, actor) VALUES (%s, %s, %s, %s)",
        (lead_id, kind, description, actor),
    )
    execute("UPDATE leads SET updated_at = NOW() WHERE id = %s", (lead_id,))


def get_lead_or_404(lead_id: int) -> Dict[str, Any]:
    row = fetch_one(f"{LEAD_SELECT} WHERE l.id = %s", (lead_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Lead not found")
    return row


def build_lead_detail(lead_id: int) -> LeadDetail:
    lead = get_lead_or_404(lead_id)
    contacts = fetch_all("SELECT * FROM contacts WHERE lead_id = %s ORDER BY is_primary DESC, created_at DESC", (lead_id,))
    notes = fetch_all("SELECT * FROM notes WHERE lead_id = %s ORDER BY created_at DESC", (lead_id,))
    follow_ups = fetch_all("SELECT * FROM follow_ups WHERE lead_id = %s ORDER BY status ASC, due_at ASC", (lead_id,))
    activities = fetch_all("SELECT * FROM activities WHERE lead_id = %s ORDER BY created_at DESC LIMIT 40", (lead_id,))
    return LeadDetail(**lead, contacts=contacts, notes=notes, follow_ups=follow_ups, activities=activities)


def model_to_update_dict(payload: LeadUpdate) -> Dict[str, Any]:
    if hasattr(payload, "model_dump"):
        return payload.model_dump(exclude_unset=True)  # Pydantic v2
    return payload.dict(exclude_unset=True)  # Pydantic v1 fallback


@app.get("/api/dashboard", response_model=DashboardData)
def dashboard() -> DashboardData:
    totals = fetch_one(
        """
        SELECT
          COUNT(*)::int AS total_leads,
          COUNT(*) FILTER (WHERE status NOT IN ('Won', 'Lost'))::int AS open_leads,
          COUNT(*) FILTER (WHERE status = 'Won')::int AS won_leads,
          COALESCE(SUM(value) FILTER (WHERE status NOT IN ('Won', 'Lost')), 0)::float AS pipeline_value,
          COALESCE(SUM(value * CASE stage
            WHEN 'Inbound' THEN 0.10
            WHEN 'Discovery' THEN 0.25
            WHEN 'Demo' THEN 0.45
            WHEN 'Negotiation' THEN 0.70
            WHEN 'Closed' THEN CASE WHEN status = 'Won' THEN 1.0 ELSE 0.0 END
            ELSE 0.1 END), 0)::float AS weighted_forecast,
          (SELECT COUNT(*) FROM follow_ups WHERE status = 'Open' AND due_at < NOW())::int AS overdue_followups
        FROM leads
        """
    )
    by_status = fetch_all(
        "SELECT status, COUNT(*)::int AS count, COALESCE(SUM(value), 0)::float AS value FROM leads GROUP BY status ORDER BY count DESC"
    )
    by_stage = fetch_all(
        "SELECT stage, COUNT(*)::int AS count, COALESCE(SUM(value), 0)::float AS value FROM leads GROUP BY stage ORDER BY value DESC"
    )
    upcoming = fetch_all("SELECT * FROM follow_ups WHERE status = 'Open' ORDER BY due_at ASC LIMIT 8")
    recent = fetch_all("SELECT * FROM activities ORDER BY created_at DESC LIMIT 10")
    return DashboardData(
        totals=totals or {},
        by_status=by_status,
        by_stage=by_stage,
        upcoming_followups=upcoming,
        recent_activity=recent,
    )


@app.get("/api/leads", response_model=List[LeadSummary])
def list_leads(
    search: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    stage: Optional[str] = Query(default=None),
    priority: Optional[str] = Query(default=None),
    source: Optional[str] = Query(default=None),
) -> List[LeadSummary]:
    conditions: List[str] = []
    params: List[Any] = []

    if search:
        conditions.append("(company ILIKE %s OR primary_contact ILIKE %s OR email ILIKE %s OR owner ILIKE %s)")
        term = f"%{search}%"
        params.extend([term, term, term, term])
    if status:
        conditions.append("status = %s")
        params.append(status)
    if stage:
        conditions.append("stage = %s")
        params.append(stage)
    if priority:
        conditions.append("priority = %s")
        params.append(priority)
    if source:
        conditions.append("source = %s")
        params.append(source)

    where = f" WHERE {' AND '.join(conditions)}" if conditions else ""
    rows = fetch_all(f"{LEAD_SELECT}{where} ORDER BY l.updated_at DESC", params)
    return [LeadSummary(**row) for row in rows]


@app.post("/api/leads", response_model=LeadDetail, status_code=201)
def create_lead(payload: LeadCreate) -> LeadDetail:
    lead = execute(
        """
        INSERT INTO leads (company, primary_contact, email, phone, source, owner, status, stage, priority, value, expected_close_date)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        RETURNING id
        """,
        (
            payload.company,
            payload.primary_contact,
            payload.email,
            payload.phone,
            payload.source,
            payload.owner,
            payload.status,
            payload.stage,
            payload.priority,
            payload.value,
            payload.expected_close_date,
        ),
    )
    if not lead:
        raise HTTPException(status_code=500, detail="Unable to create lead")
    lead_id = lead["id"]
    execute(
        "INSERT INTO contacts (lead_id, name, role, email, phone, is_primary) VALUES (%s,%s,%s,%s,%s,%s)",
        (lead_id, payload.primary_contact, "Primary contact", payload.email, payload.phone, True),
    )
    add_activity(lead_id, "lead_created", f"Lead created for {payload.company}", payload.owner)
    return build_lead_detail(lead_id)


@app.get("/api/leads/{lead_id}", response_model=LeadDetail)
def get_lead(lead_id: int) -> LeadDetail:
    return build_lead_detail(lead_id)


@app.patch("/api/leads/{lead_id}", response_model=LeadDetail)
def update_lead(lead_id: int, payload: LeadUpdate) -> LeadDetail:
    get_lead_or_404(lead_id)
    updates = model_to_update_dict(payload)
    if updates:
        assignments = []
        params: List[Any] = []
        for key, value in updates.items():
            assignments.append(f"{key} = %s")
            params.append(value)
        params.append(lead_id)
        execute(f"UPDATE leads SET {', '.join(assignments)}, updated_at = NOW() WHERE id = %s", params)
        changed = ", ".join(updates.keys()).replace("_", " ")
        add_activity(lead_id, "lead_updated", f"Updated {changed}", "Sales Team")
    return build_lead_detail(lead_id)


@app.post("/api/leads/{lead_id}/contacts", response_model=Contact, status_code=201)
def add_contact(lead_id: int, payload: ContactCreate) -> Contact:
    get_lead_or_404(lead_id)
    if payload.is_primary:
        execute("UPDATE contacts SET is_primary = FALSE WHERE lead_id = %s", (lead_id,))
    row = execute(
        """
        INSERT INTO contacts (lead_id, name, role, email, phone, is_primary)
        VALUES (%s,%s,%s,%s,%s,%s)
        RETURNING *
        """,
        (lead_id, payload.name, payload.role, payload.email, payload.phone, payload.is_primary),
    )
    add_activity(lead_id, "contact_added", f"Added contact {payload.name}", "Sales Team")
    return Contact(**row)


@app.post("/api/leads/{lead_id}/notes", response_model=Note, status_code=201)
def add_note(lead_id: int, payload: NoteCreate) -> Note:
    get_lead_or_404(lead_id)
    row = execute(
        "INSERT INTO notes (lead_id, author, body) VALUES (%s,%s,%s) RETURNING *",
        (lead_id, payload.author, payload.body),
    )
    add_activity(lead_id, "note_added", "Added a lead note", payload.author)
    return Note(**row)


@app.post("/api/leads/{lead_id}/follow-ups", response_model=FollowUp, status_code=201)
def add_follow_up(lead_id: int, payload: FollowUpCreate) -> FollowUp:
    get_lead_or_404(lead_id)
    row = execute(
        """
        INSERT INTO follow_ups (lead_id, title, due_at, assigned_to)
        VALUES (%s,%s,%s,%s)
        RETURNING *
        """,
        (lead_id, payload.title, payload.due_at, payload.assigned_to),
    )
    add_activity(lead_id, "follow_up_created", f"Scheduled follow-up: {payload.title}", payload.assigned_to)
    return FollowUp(**row)


@app.patch("/api/leads/{lead_id}/follow-ups/{follow_up_id}/complete", response_model=FollowUp)
def complete_follow_up(lead_id: int, follow_up_id: int) -> FollowUp:
    get_lead_or_404(lead_id)
    row = execute(
        """
        UPDATE follow_ups
        SET status = 'Completed', completed_at = NOW()
        WHERE id = %s AND lead_id = %s
        RETURNING *
        """,
        (follow_up_id, lead_id),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Follow-up not found")
    add_activity(lead_id, "follow_up_completed", f"Completed follow-up: {row['title']}", row["assigned_to"])
    return FollowUp(**row)
