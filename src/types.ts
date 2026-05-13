export type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Proposal' | 'Won' | 'Lost';
export type LeadStage = 'Inbound' | 'Discovery' | 'Demo' | 'Negotiation' | 'Closed';
export type Priority = 'Low' | 'Medium' | 'High';
export type FollowUpStatus = 'Open' | 'Completed';

export interface LeadSummary {
  id: number;
  company: string;
  primary_contact: string;
  email: string;
  phone: string;
  source: string;
  owner: string;
  status: LeadStatus;
  stage: LeadStage;
  priority: Priority;
  value: number;
  expected_close_date: string | null;
  last_activity_at: string | null;
  next_follow_up_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: number;
  lead_id: number;
  name: string;
  role: string;
  email: string;
  phone: string;
  is_primary: boolean;
  created_at: string;
}

export interface Note {
  id: number;
  lead_id: number;
  author: string;
  body: string;
  created_at: string;
}

export interface FollowUp {
  id: number;
  lead_id: number;
  title: string;
  due_at: string;
  status: FollowUpStatus;
  assigned_to: string;
  created_at: string;
  completed_at: string | null;
}

export interface Activity {
  id: number;
  lead_id: number;
  kind: string;
  description: string;
  actor: string;
  created_at: string;
}

export interface LeadDetail extends LeadSummary {
  contacts: Contact[];
  notes: Note[];
  follow_ups: FollowUp[];
  activities: Activity[];
}

export interface LeadCreatePayload {
  company: string;
  primary_contact: string;
  email: string;
  phone: string;
  source: string;
  owner: string;
  status: LeadStatus;
  stage: LeadStage;
  priority: Priority;
  value: number;
  expected_close_date: string | null;
}

export interface LeadUpdatePayload {
  company?: string;
  primary_contact?: string;
  email?: string;
  phone?: string;
  source?: string;
  owner?: string;
  status?: LeadStatus;
  stage?: LeadStage;
  priority?: Priority;
  value?: number;
  expected_close_date?: string | null;
}

export interface ContactCreatePayload {
  name: string;
  role: string;
  email: string;
  phone: string;
  is_primary: boolean;
}

export interface NoteCreatePayload {
  author: string;
  body: string;
}

export interface FollowUpCreatePayload {
  title: string;
  due_at: string;
  assigned_to: string;
}

export interface DashboardData {
  totals: {
    total_leads: number;
    open_leads: number;
    won_leads: number;
    pipeline_value: number;
    weighted_forecast: number;
    overdue_followups: number;
  };
  by_status: Array<{ status: LeadStatus; count: number; value: number }>;
  by_stage: Array<{ stage: LeadStage; count: number; value: number }>;
  upcoming_followups: FollowUp[];
  recent_activity: Activity[];
}

export interface LeadFilters {
  search?: string;
  status?: string;
  stage?: string;
  priority?: string;
  source?: string;
}
