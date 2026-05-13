import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import LeadForm from '../components/LeadForm';
import type { LeadCreatePayload, LeadFilters, LeadSummary } from '../types';

interface LeadListProps {
  onOpenLead: (id: number) => void;
}

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export default function LeadList({ onOpenLead }: LeadListProps) {
  const [leads, setLeads] = useState<LeadSummary[]>([]);
  const [filters, setFilters] = useState<LeadFilters>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const sources = useMemo(() => Array.from(new Set(leads.map((lead) => lead.source))).sort(), [leads]);

  const loadLeads = () => {
    setLoading(true);
    api
      .listLeads(filters)
      .then((result) => {
        setLeads(result);
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = window.setTimeout(loadLeads, 180);
    return () => window.clearTimeout(timer);
  }, [filters.search, filters.status, filters.stage, filters.priority, filters.source]);

  const createLead = async (payload: LeadCreatePayload) => {
    const created = await api.createLead(payload);
    setShowCreate(false);
    onOpenLead(created.id);
  };

  return (
    <section className="page-stack">
      <div className="page-header split">
        <div>
          <p className="eyebrow">Lead workspace</p>
          <h1>Leads</h1>
          <p>Search, qualify, and prioritize every opportunity in the pipeline.</p>
        </div>
        <button className="button primary" onClick={() => setShowCreate(true)}>+ New lead</button>
      </div>

      {showCreate && (
        <article className="card">
          <div className="card-header">
            <div>
              <h2>Create a new lead</h2>
              <p>Capture the essential details so your team can follow up quickly.</p>
            </div>
          </div>
          <LeadForm onSubmit={createLead} onCancel={() => setShowCreate(false)} />
        </article>
      )}

      <article className="card">
        <div className="filter-grid">
          <label className="search-field">
            Search
            <input value={filters.search || ''} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Company, contact, owner, email…" />
          </label>
          <label>
            Status
            <select value={filters.status || ''} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
              <option value="">All statuses</option>
              {['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'].map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label>
            Stage
            <select value={filters.stage || ''} onChange={(event) => setFilters((current) => ({ ...current, stage: event.target.value }))}>
              <option value="">All stages</option>
              {['Inbound', 'Discovery', 'Demo', 'Negotiation', 'Closed'].map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label>
            Priority
            <select value={filters.priority || ''} onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}>
              <option value="">All priorities</option>
              {['Low', 'Medium', 'High'].map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label>
            Source
            <select value={filters.source || ''} onChange={(event) => setFilters((current) => ({ ...current, source: event.target.value }))}>
              <option value="">All sources</option>
              {sources.map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
        </div>
      </article>

      <article className="card table-card">
        {loading && <div className="page-state inline">Loading leads…</div>}
        {error && <div className="page-state error inline">Unable to load leads: {error}</div>}
        {!loading && !error && leads.length === 0 && <div className="empty-state">No leads match your filters. Try a broader search or create a new lead.</div>}
        {!loading && !error && leads.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Status</th>
                  <th>Stage</th>
                  <th>Priority</th>
                  <th>Owner</th>
                  <th>Value</th>
                  <th>Next follow-up</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} onClick={() => onOpenLead(lead.id)}>
                    <td>
                      <strong>{lead.company}</strong>
                      <small>{lead.primary_contact} · {lead.email}</small>
                    </td>
                    <td><span className={`badge status-${lead.status.toLowerCase()}`}>{lead.status}</span></td>
                    <td>{lead.stage}</td>
                    <td><span className={`priority priority-${lead.priority.toLowerCase()}`}>{lead.priority}</span></td>
                    <td>{lead.owner}</td>
                    <td>{currency.format(lead.value)}</td>
                    <td>{lead.next_follow_up_at ? new Date(lead.next_follow_up_at).toLocaleDateString() : 'Not scheduled'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}
