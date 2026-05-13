import { FormEvent, useState } from 'react';
import type { LeadCreatePayload, LeadStage, LeadStatus, Priority } from '../types';

interface LeadFormProps {
  onSubmit: (payload: LeadCreatePayload) => Promise<void>;
  onCancel: () => void;
}

const statuses: LeadStatus[] = ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'];
const stages: LeadStage[] = ['Inbound', 'Discovery', 'Demo', 'Negotiation', 'Closed'];
const priorities: Priority[] = ['Low', 'Medium', 'High'];

export default function LeadForm({ onSubmit, onCancel }: LeadFormProps) {
  const [form, setForm] = useState<LeadCreatePayload>({
    company: '',
    primary_contact: '',
    email: '',
    phone: '',
    source: 'Website',
    owner: 'Avery Stone',
    status: 'New',
    stage: 'Inbound',
    priority: 'Medium',
    value: 10000,
    expected_close_date: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof LeadCreatePayload>(key: K, value: LeadCreatePayload[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.company.trim() || !form.primary_contact.trim() || !form.email.trim()) {
      setError('Company, primary contact, and email are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ ...form, expected_close_date: form.expected_close_date || null });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save lead.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="panel-form" onSubmit={submit}>
      <div className="form-grid">
        <label>
          Company
          <input value={form.company} onChange={(event) => update('company', event.target.value)} placeholder="Acme Operations" />
        </label>
        <label>
          Primary contact
          <input value={form.primary_contact} onChange={(event) => update('primary_contact', event.target.value)} placeholder="Jordan Lee" />
        </label>
        <label>
          Email
          <input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="jordan@company.com" />
        </label>
        <label>
          Phone
          <input value={form.phone} onChange={(event) => update('phone', event.target.value)} placeholder="(555) 014-9021" />
        </label>
        <label>
          Source
          <input value={form.source} onChange={(event) => update('source', event.target.value)} placeholder="Referral, Website, Event" />
        </label>
        <label>
          Owner
          <input value={form.owner} onChange={(event) => update('owner', event.target.value)} />
        </label>
        <label>
          Status
          <select value={form.status} onChange={(event) => update('status', event.target.value as LeadStatus)}>
            {statuses.map((status) => <option key={status}>{status}</option>)}
          </select>
        </label>
        <label>
          Stage
          <select value={form.stage} onChange={(event) => update('stage', event.target.value as LeadStage)}>
            {stages.map((stage) => <option key={stage}>{stage}</option>)}
          </select>
        </label>
        <label>
          Priority
          <select value={form.priority} onChange={(event) => update('priority', event.target.value as Priority)}>
            {priorities.map((priority) => <option key={priority}>{priority}</option>)}
          </select>
        </label>
        <label>
          Deal value
          <input type="number" min="0" value={form.value} onChange={(event) => update('value', Number(event.target.value))} />
        </label>
        <label>
          Expected close
          <input type="date" value={form.expected_close_date || ''} onChange={(event) => update('expected_close_date', event.target.value)} />
        </label>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button type="button" className="button secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="button primary" disabled={saving}>{saving ? 'Saving…' : 'Create lead'}</button>
      </div>
    </form>
  );
}
