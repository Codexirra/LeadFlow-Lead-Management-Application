import { useEffect, useState } from 'react';
import { api } from '../api';
import type { DashboardData } from '../types';

interface DashboardProps {
  onOpenLead: (id: number) => void;
}

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export default function Dashboard({ onOpenLead }: DashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api
      .getDashboard()
      .then((result) => {
        if (mounted) {
          setData(result);
          setError(null);
        }
      })
      .catch((err: Error) => mounted && setError(err.message))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <div className="page-state">Loading dashboard intelligence…</div>;
  }

  if (error || !data) {
    return <div className="page-state error">Unable to load dashboard: {error}</div>;
  }

  return (
    <section className="page-stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">Sales command center</p>
          <h1>Lead pipeline dashboard</h1>
          <p>Monitor pipeline value, urgent follow-ups, and the latest selling activity.</p>
        </div>
      </div>

      <div className="metrics-grid">
        <Metric label="Total leads" value={data.totals.total_leads.toString()} helper={`${data.totals.open_leads} still active`} />
        <Metric label="Pipeline value" value={currency.format(data.totals.pipeline_value)} helper="Open opportunity value" />
        <Metric label="Weighted forecast" value={currency.format(data.totals.weighted_forecast)} helper="Based on current stage" />
        <Metric label="Overdue follow-ups" value={data.totals.overdue_followups.toString()} helper="Need immediate attention" warning={data.totals.overdue_followups > 0} />
      </div>

      <div className="dashboard-grid">
        <article className="card span-2">
          <div className="card-header">
            <div>
              <h2>Pipeline by stage</h2>
              <p>Where your active revenue is concentrated.</p>
            </div>
          </div>
          <div className="stage-list">
            {data.by_stage.map((stage) => {
              const max = Math.max(...data.by_stage.map((item) => item.value), 1);
              const width = Math.max(8, (stage.value / max) * 100);
              return (
                <div className="stage-row" key={stage.stage}>
                  <div className="stage-label">
                    <strong>{stage.stage}</strong>
                    <span>{stage.count} leads · {currency.format(stage.value)}</span>
                  </div>
                  <div className="progress-track"><div style={{ width: `${width}%` }} /></div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="card">
          <h2>Status mix</h2>
          <div className="status-stack">
            {data.by_status.map((item) => (
              <div className="status-pill-row" key={item.status}>
                <span className={`badge status-${item.status.toLowerCase()}`}>{item.status}</span>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="dashboard-grid">
        <article className="card">
          <h2>Upcoming follow-ups</h2>
          {data.upcoming_followups.length === 0 ? (
            <p className="muted">No open follow-ups. Your queue is clear.</p>
          ) : (
            <div className="compact-list">
              {data.upcoming_followups.map((followUp) => (
                <button key={followUp.id} className="compact-item" onClick={() => onOpenLead(followUp.lead_id)}>
                  <span>
                    <strong>{followUp.title}</strong>
                    <small>{followUp.assigned_to} · {new Date(followUp.due_at).toLocaleString()}</small>
                  </span>
                  <span>→</span>
                </button>
              ))}
            </div>
          )}
        </article>

        <article className="card span-2">
          <h2>Recent activity</h2>
          <div className="timeline">
            {data.recent_activity.map((activity) => (
              <button className="timeline-item" key={activity.id} onClick={() => onOpenLead(activity.lead_id)}>
                <span className="timeline-dot" />
                <span>
                  <strong>{activity.description}</strong>
                  <small>{activity.actor} · {new Date(activity.created_at).toLocaleString()}</small>
                </span>
              </button>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

function Metric({ label, value, helper, warning = false }: { label: string; value: string; helper: string; warning?: boolean }) {
  return (
    <article className={`metric-card ${warning ? 'warning' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{helper}</small>
    </article>
  );
}
