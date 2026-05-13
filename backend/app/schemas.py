from datetime import date, datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, EmailStr, Field

LeadStatus = Literal["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"]
LeadStage = Literal["Inbound", "Discovery", "Demo", "Negotiation", "Closed"]
Priority = Literal["Low", "Medium", "High"]
FollowUpStatus = Literal["Open", "Completed"]


class LeadBase(BaseModel):
    company: str = Field(min_length=1, max_length=160)
    primary_contact: str = Field(min_length=1, max_length=120)
    email: EmailStr
    phone: str = ""
    source: str = Field(default="Website", max_length=80)
    owner: str = Field(default="Avery Stone", max_length=120)
    status: LeadStatus = "New"
    stage: LeadStage = "Inbound"
    priority: Priority = "Medium"
    value: float = Field(default=0, ge=0)
    expected_close_date: Optional[date] = None


class LeadCreate(LeadBase):
    pass


class LeadUpdate(BaseModel):
    company: Optional[str] = None
    primary_contact: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    source: Optional[str] = None
    owner: Optional[str] = None
    status: Optional[LeadStatus] = None
    stage: Optional[LeadStage] = None
    priority: Optional[Priority] = None
    value: Optional[float] = Field(default=None, ge=0)
    expected_close_date: Optional[date] = None


class LeadSummary(LeadBase):
    id: int
    last_activity_at: Optional[datetime]
    next_follow_up_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime


class ContactCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    role: str = ""
    email: EmailStr
    phone: str = ""
    is_primary: bool = False


class Contact(ContactCreate):
    id: int
    lead_id: int
    created_at: datetime


class NoteCreate(BaseModel):
    author: str = Field(default="Sales Team", max_length=120)
    body: str = Field(min_length=1, max_length=5000)


class Note(NoteCreate):
    id: int
    lead_id: int
    created_at: datetime


class FollowUpCreate(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    due_at: datetime
    assigned_to: str = Field(default="Sales Team", max_length=120)


class FollowUp(BaseModel):
    id: int
    lead_id: int
    title: str
    due_at: datetime
    status: FollowUpStatus
    assigned_to: str
    created_at: datetime
    completed_at: Optional[datetime]


class Activity(BaseModel):
    id: int
    lead_id: int
    kind: str
    description: str
    actor: str
    created_at: datetime


class LeadDetail(LeadSummary):
    contacts: List[Contact]
    notes: List[Note]
    follow_ups: List[FollowUp]
    activities: List[Activity]


class DashboardTotals(BaseModel):
    total_leads: int
    open_leads: int
    won_leads: int
    pipeline_value: float
    weighted_forecast: float
    overdue_followups: int


class StatusBreakdown(BaseModel):
    status: LeadStatus
    count: int
    value: float


class StageBreakdown(BaseModel):
    stage: LeadStage
    count: int
    value: float


class DashboardData(BaseModel):
    totals: DashboardTotals
    by_status: List[StatusBreakdown]
    by_stage: List[StageBreakdown]
    upcoming_followups: List[FollowUp]
    recent_activity: List[Activity]
