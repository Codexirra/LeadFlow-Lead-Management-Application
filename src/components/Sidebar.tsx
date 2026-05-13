type Route = { name: 'dashboard' } | { name: 'leads' } | { name: 'lead-detail'; id: number };

interface SidebarProps {
  active: 'dashboard' | 'leads';
  onNavigate: (route: Route) => void;
}

export default function Sidebar({ active, onNavigate }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">LF</div>
        <div>
          <strong>LeadFlow</strong>
          <span>Pipeline CRM</span>
        </div>
      </div>

      <nav className="nav-list" aria-label="Primary navigation">
        <button className={active === 'dashboard' ? 'active' : ''} onClick={() => onNavigate({ name: 'dashboard' })}>
          <span>◈</span>
          Dashboard
        </button>
        <button className={active === 'leads' ? 'active' : ''} onClick={() => onNavigate({ name: 'leads' })}>
          <span>◎</span>
          Leads
        </button>
      </nav>

      <div className="sidebar-card">
        <p className="eyebrow">Today’s focus</p>
        <h3>Move qualified leads forward</h3>
        <p>Review follow-ups, capture notes, and keep high-value opportunities warm.</p>
      </div>
    </aside>
  );
}
