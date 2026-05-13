import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api';
import type { ContactCreatePayload, FollowUpCreatePayload, LeadDetail as LeadDetailType, LeadStage, LeadStatus, LeadUpdatePayload, NoteCreatePayload, Priority } from '../types';

interface LeadDetailProps {
  id: number;
  onBack: () => void;
}

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const statuses: LeadStatus[] = ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'];
const stages: LeadStage[] = ['Inbound', 'Discovery', 'Demo', 'Negotiation', 'Closed'];
const priorities: Priority[] = ['Low', 'Medium', 'High'];
type UpdatableLeadField = 'status' | 'stage' | 'priority' | 'owner' | 'value' | 'expected_close_date';

export default function LeadDetail({ id, onBack }: LeadDetailProps) {
  const [lead, setLead] = useState<LeadDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteBody, setNoteBody] = useState('');
  const [contact, setContact] = useState<ContactCreatePayload>({ name: '', role: '', email: '', phone: '', is_primary: false });
  const [followUp, setFollowUp] = useState<FollowUpCreatePayload>({ title: '', due_at: '', assigned_to: '' });
  const [saving, setSaving] = useState(false);

  const loadLead = () => {
    setLoading(true);
    api
      .getLead(id)
      .then((result) => {
        setLead(result);
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLead();
  }, [id]);

  const updateLead = async (field: UpdatableLeadField, value: string) => {
    if (!lead) return;

    let payload: LeadUpdatePayload;
    switch (field) {
      case 'status':
        payload = { status: value as LeadStatus };
        break;
      case 'stage':
        payload = { stage: value as LeadStage };
        break;
      case 'priority':
        payload = { priority: value as Priority };
        break;
      case 'owner':
        payload = { owner: value };
        break;
      case 'value':
        payload = { value: Number(value) || 0 };
        break;
      case 'expected_close_date':
        payload = { expected_close_date: value || null };
        break;
    }

    const updated = await api.updateLead(lead.id, payload);
    setLead(updated);
  };

  const addNote = async (event: FormEvent) => {
    event.preventDefault();
    if (!lead || !noteBody.trim()) return;
    setSaving(true);
    try {
      await api.addNote(lead.id, { author: lead.owner, body: noteBody } satisfies NoteCreatePayload);
      setNoteBody('');
      loadLead();
    } finally {
      setSaving(false);
    }
  };

  const addContact = async (event: FormEvent) => {
    event.preventDefault();
    if (!lead || !contact.name.trim() || !contact.email.trim()) return;
    setSaving(true);
    try {
      await api.addContact(lead.id, contact);
      setContact({ name: '', role: '', email: '', phone: '', is_primary: false });
      loadLead();
    } finally {
      setSaving(false);
    }
  };

  const addFollowUp = async (event: FormEvent) => {
    event.preventDefault();
    if (!lead || !followUp.title.trim() || !followUp.due_at) return;
    setSaving(true);
    try {
      await api.addFollowUp(lead.id, { ...followUp, assigned_to: followUp.assigned_to || lead.owner });
      setFollowUp({ title: '', due_at: '', assigned_to: '' });
      loadLead();
    } finally {
      setSaving(false);
    }
  };

  const completeFollowUp = async (followUpId: number) => {
    if (!lead) return;
    await api.completeFollowUp(lead.id, followUpId);
    loadLead();
  };

  if (loading) return <div className="page-state">Loading lead profile…</div>;
  if (error || !lead) return <div className="page-state error">Unable to load lead: {error}</div>;

  return (
    <section className="page-stack">
      <button className="back-link" onClick={onBack}>← Back to leads</button>
      <div className="detail-hero">
        <div>
          <p className="eyebrow">Lead detail</p>
          <h1>{lead.company}</h1>
          <p>{lead.primary_contact} · {lead.email} · {lead.phone || 'No phone on file'}</p>
        </div>
        <div className="hero-value">
          <span>Potential value</span>
          <strong>{currency.format(lead.value)}</strong>
        </div>
      </div>

      <div className="detail-grid">
        <article className="card detail-main">
          <div className="card-header">
            <div>
              <h2>Pipeline controls</h2>
              <p>Update qualification state as the opportunity progresses.</p>
            </div>
          </div>
          <div className="form-grid compact">
            <label>Status
              <select value={lead.status} onChange={(event) => updateLead('status', event.target.value)}>
                {statuses.map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
            <label>Stage
              <select value={lead.stage} onChange={(event) => updateLead('stage', event.target.value)}>
                {stages.map((stage) => <option key={stage}>{stage}</option>)}
              </select>
            </label>
            <label>Priority
              <select value={lead.priority} onChange={(event) => updateLead('priority', event.target.value)}>
                {priorities.map((priority) => <option key={priority}>{priority}</option>)}
              </select>
            </label>
            <label>Owner
              <input value={lead.owner} onChange={(event) => updateLead('owner', event.target.value)} />
            </label>
            <label>Deal value
              <input type="number" value={lead.value} onChange={(event) => updateLead('value', event.target.value)} />
            </label>
            <label>Expected close
              <input type="date" value={lead.expected_close_date || ''} onChange={(event) => updateLead('expected_close_date', event.target.value)} />
            </label>
          </div>
        </article>

        <aside className="card">
          <h2>Lead summary</h2>
          <dl className="summary-list">
            <div><dt>Source</dt><dd>{lead.source}</dd></div>
            <div><dt>Created</dt><dd>{new Date(lead.created_at).toLocaleDateString()}</dd></div>
            <div><dt>Last activity</dt><dd>{lead.last_activity_at ? new Date(lead.last_activity_at).toLocaleString() : 'None yet'}</dd></div>
            <div><dt>Next follow-up</dt><dd>{lead.next_follow_up_at ? new Date(lead.next_follow_up_at).toLocaleString() : 'Not scheduled'}</dd></div>
          </dl>
        </aside>
      </div>

      <div className="detail-grid">
        <article className="card">
          <h2>Contacts</h2>
          <div className="record-list">
            {lead.contacts.map((item) => (
              <div className="record" key={item.id}>
                <strong>{item.name} {item.is_primary && <span className="mini-badge">Primary</span>}</strong>
                <small>{item.role || 'Contact'} · {item.email} · {item.phone || 'No phone'}</small>
              </div>
            ))}
          </div>
          <form className="inline-form" onSubmit={addContact}>
            <input placeholder="Name" value={contact.name} onChange={(event) => setContact((current) => ({ ...current, name: event.target.value }))} />
            <input placeholder="Role" value={contact.role} onChange={(event) => setContact((current) => ({ ...current, role: event.target.value }))} />
            <input placeholder="Email" value={contact.email} onChange={(event) => setContact((current) => ({ ...current, email: event.target.value }))} />
            <input placeholder="Phone" value={contact.phone} onChange={(event) => setContact((current) => ({ ...current, phone: event.target.value }))} />
            <button className="button secondary" disabled={saving}>Add contact</button>
          </form>
        </article>

        <article className="card">
          <h2>Follow-ups</h2>
          <div className="record-list">
            {lead.follow_ups.map((item) => (
              <div className="record with-action" key={item.id}>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.assigned_to} · {new Date(item.due_at).toLocaleString()} · {item.status}</small>
                </span>
                {item.status === 'Open' && <button className="button ghost" onClick={() => completeFollowUp(item.id)}>Complete</button>}
              </div>
            ))}
            {lead.follow_ups.length === 0 && <p className="muted">No follow-ups scheduled.</p>}
          </div>
          <form className="inline-form" onSubmit={addFollowUp}>
            <input placeholder="Follow-up title" value={followUp.title} onChange={(event) => setFollowUp((current) => ({ ...current, title: event.target.value }))} />
            <input type="datetime-local" value={followUp.due_at} onChange={(event) => setFollowUp((current) => ({ ...current, due_at: event.target.value }))} />
            <input placeholder="Assigned to" value={followUp.assigned_to} onChange={(event) => setFollowUp((current) => ({ ...current, assigned_to: event.target.value }))} />
            <button className="button secondary" disabled={saving}>Schedule</button>
          </form>
        </article>
      </div>

      <div className="detail-grid">
        <article className="card">
          <h2>Notes</h2>
          <form className="note-form" onSubmit={addNote}>
            <textarea value={noteBody} onChange={(event) => setNoteBody(event.target.value)} placeholder="Add a call recap, objection, buying signal, or next step…" />
            <button className="button primary" disabled={saving}>{saving ? 'Saving…' : 'Add note'}</button>
          </form>
          <div className="record-list">
            {lead.notes.map((note) => (
              <div className="record" key={note.id}>
                <strong>{note.author}</strong>
                <p>{note.body}</p>
                <small>{new Date(note.created_at).toLocaleString()}</small>
              </div>
            ))}
            {lead.notes.length === 0 && <p className="muted">No notes yet. Add the first sales insight.</p>}
          </div>
        </article>

        <article className="card">
          <h2>Pipeline activity</h2>
          <div className="timeline detail-timeline">
            {lead.activities.map((activity) => (
              <div className="timeline-item static" key={activity.id}>
                <span className="timeline-dot" />
                <span>
                  <strong>{activity.description}</strong>
                  <small>{activity.actor} · {new Date(activity.created_at).toLocaleString()}</small>
                </span>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
