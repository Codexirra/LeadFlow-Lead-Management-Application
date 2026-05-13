import os
from contextlib import contextmanager
from typing import Any, Dict, Iterable, Iterator, Optional, Union

import psycopg
from dotenv import load_dotenv
from psycopg.rows import dict_row

load_dotenv(override=False)

QueryParams = Optional[Union[Iterable[Any], Dict[str, Any]]]


def get_database_url() -> str:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is required. Configure it with a Postgres connection string.")
    return database_url


@contextmanager
def get_connection() -> Iterator[Any]:
    conn = psycopg.connect(get_database_url(), row_factory=dict_row, connect_timeout=5)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def fetch_all(query: str, params: QueryParams = None) -> list[dict[str, Any]]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            return list(cur.fetchall())


def fetch_one(query: str, params: QueryParams = None) -> Optional[dict[str, Any]]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            row = cur.fetchone()
            return dict(row) if row else None


def execute(query: str, params: QueryParams = None) -> Optional[dict[str, Any]]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            if cur.description:
                row = cur.fetchone()
                return dict(row) if row else None
            return None


def init_schema() -> None:
    statements = [
        """
        CREATE TABLE IF NOT EXISTS leads (
            id SERIAL PRIMARY KEY,
            company TEXT NOT NULL,
            primary_contact TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT NOT NULL DEFAULT '',
            source TEXT NOT NULL DEFAULT 'Website',
            owner TEXT NOT NULL DEFAULT 'Sales Team',
            status TEXT NOT NULL DEFAULT 'New',
            stage TEXT NOT NULL DEFAULT 'Inbound',
            priority TEXT NOT NULL DEFAULT 'Medium',
            value NUMERIC(14,2) NOT NULL DEFAULT 0,
            expected_close_date DATE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS contacts (
            id SERIAL PRIMARY KEY,
            lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT '',
            email TEXT NOT NULL,
            phone TEXT NOT NULL DEFAULT '',
            is_primary BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS notes (
            id SERIAL PRIMARY KEY,
            lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
            author TEXT NOT NULL,
            body TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS follow_ups (
            id SERIAL PRIMARY KEY,
            lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            due_at TIMESTAMPTZ NOT NULL,
            status TEXT NOT NULL DEFAULT 'Open',
            assigned_to TEXT NOT NULL DEFAULT 'Sales Team',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            completed_at TIMESTAMPTZ
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS activities (
            id SERIAL PRIMARY KEY,
            lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
            kind TEXT NOT NULL,
            description TEXT NOT NULL,
            actor TEXT NOT NULL DEFAULT 'System',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """,
        "CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)",
        "CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage)",
        "CREATE INDEX IF NOT EXISTS idx_followups_due ON follow_ups(due_at)",
        "CREATE INDEX IF NOT EXISTS idx_activities_lead_created ON activities(lead_id, created_at DESC)",
    ]
    with get_connection() as conn:
        with conn.cursor() as cur:
            for statement in statements:
                cur.execute(statement)


def seed_data() -> None:
    row = fetch_one("SELECT COUNT(*) AS count FROM leads")
    if row and row["count"] > 0:
        return

    samples = [
        ("Northstar Logistics", "Maya Patel", "maya.patel@northstar.example", "(555) 013-4482", "Website", "Avery Stone", "Qualified", "Demo", "High", 68000, "2025-03-18"),
        ("Cobalt Health Group", "Ethan Brooks", "ethan@cobalthealth.example", "(555) 018-2391", "Referral", "Morgan Chen", "Proposal", "Negotiation", "High", 124000, "2025-03-29"),
        ("Atlas Retail Co.", "Sofia Nguyen", "sofia@atlasretail.example", "(555) 019-8410", "Trade Show", "Avery Stone", "Contacted", "Discovery", "Medium", 36000, "2025-04-05"),
        ("Brightline Studios", "Noah Wright", "noah@brightline.example", "(555) 011-7774", "LinkedIn", "Jamie Rivera", "New", "Inbound", "Medium", 18000, "2025-04-12"),
        ("Summit Fintech", "Priya Shah", "priya@summitfin.example", "(555) 016-9043", "Partner", "Morgan Chen", "Won", "Closed", "High", 92000, "2025-02-20"),
        ("Greenfield Supply", "Leo Martinez", "leo@greenfield.example", "(555) 014-1200", "Website", "Jamie Rivera", "Lost", "Closed", "Low", 14000, "2025-02-28"),
    ]

    for sample in samples:
        lead = execute(
            """
            INSERT INTO leads (company, primary_contact, email, phone, source, owner, status, stage, priority, value, expected_close_date)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            RETURNING id, company, primary_contact, owner, status
            """,
            sample,
        )
        if not lead:
            continue
        lead_id = lead["id"]
        execute(
            "INSERT INTO contacts (lead_id, name, role, email, phone, is_primary) VALUES (%s,%s,%s,%s,%s,%s)",
            (lead_id, sample[1], "Decision maker", sample[2], sample[3], True),
        )
        execute(
            "INSERT INTO notes (lead_id, author, body) VALUES (%s,%s,%s)",
            (lead_id, sample[5], f"Initial qualification captured for {sample[0]}. Primary pain point is improving pipeline visibility and sales handoff quality."),
        )
        execute(
            "INSERT INTO follow_ups (lead_id, title, due_at, assigned_to) VALUES (%s,%s, NOW() + INTERVAL '2 days', %s)",
            (lead_id, f"Follow up with {sample[1]}", sample[5]),
        )
        execute(
            "INSERT INTO activities (lead_id, kind, description, actor) VALUES (%s,%s,%s,%s)",
            (lead_id, "seed", f"Lead created for {sample[0]}", "System"),
        )
