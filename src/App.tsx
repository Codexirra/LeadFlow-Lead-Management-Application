import { useEffect, useMemo, useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import LeadDetail from './pages/LeadDetail';
import LeadList from './pages/LeadList';

type Route = { name: 'dashboard' } | { name: 'leads' } | { name: 'lead-detail'; id: number };

function parseRoute(): Route {
  const path = window.location.pathname;
  const match = path.match(/^\/leads\/(\d+)$/);
  if (match) return { name: 'lead-detail', id: Number(match[1]) };
  if (path === '/leads') return { name: 'leads' };
  return { name: 'dashboard' };
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => parseRoute());

  useEffect(() => {
    const onPopState = () => setRoute(parseRoute());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = (next: Route) => {
    const path = next.name === 'dashboard' ? '/' : next.name === 'leads' ? '/leads' : `/leads/${next.id}`;
    window.history.pushState({}, '', path);
    setRoute(next);
  };

  const activeSection = useMemo(() => (route.name === 'dashboard' ? 'dashboard' : 'leads'), [route]);

  return (
    <div className="app-shell">
      <Sidebar active={activeSection} onNavigate={navigate} />
      <main className="main-content">
        {route.name === 'dashboard' && <Dashboard onOpenLead={(id) => navigate({ name: 'lead-detail', id })} />}
        {route.name === 'leads' && <LeadList onOpenLead={(id) => navigate({ name: 'lead-detail', id })} />}
        {route.name === 'lead-detail' && <LeadDetail id={route.id} onBack={() => navigate({ name: 'leads' })} />}
      </main>
    </div>
  );
}
