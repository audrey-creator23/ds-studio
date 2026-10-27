import { useEffect, useState } from 'react';
import Dashboard from './Dashboard.js';
import Brief from './Brief.js';
import { Badge, Button, ToggleGroup } from './ui.js';

// Itération v3 : Dashboard et Brief disponibles ; les autres pages sont
// annoncées dans la navigation mais désactivées. ?vue=… garde la page.
const pages = [
  { id: 'home', label: 'Accueil' },
  { id: 'design', label: 'Design' },
  { id: 'assistant', label: 'Contexte & Assistant' },
  { id: 'brief', label: 'Brief projet' },
  { id: 'dashboard', label: 'Dashboard' },
] as const;
type Ready = 'dashboard' | 'brief';
const ready: Ready[] = ['dashboard', 'brief'];

function stored(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Préférence facultative. */
  }
}
const fromUrl = (): Ready => {
  const v = new URLSearchParams(location.search).get('vue');
  return ready.includes(v as Ready) ? (v as Ready) : 'dashboard';
};

export default function App() {
  const [page, setPage] = useState<Ready>(fromUrl);
  const [theme, setTheme] = useState(() => stored('ds-v3-theme', 'dark'));
  const [collapsed, setCollapsed] = useState(
    () => stored('ds-v3-nav', 'open') === 'closed',
  );
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    store('ds-v3-theme', theme);
  }, [theme]);
  useEffect(
    () => store('ds-v3-nav', collapsed ? 'closed' : 'open'),
    [collapsed],
  );
  useEffect(() => {
    const url = new URL(location.href);
    url.searchParams.set('vue', page);
    history.replaceState(null, '', url);
  }, [page]);
  function go(next: Ready) {
    setPage(next);
    requestAnimationFrame(() => document.getElementById('page-title')?.focus());
  }

  return (
    <div className="shell" data-nav={collapsed ? 'closed' : 'open'}>
      <a className="skip" href="#page-title">
        Aller au contenu
      </a>
      <aside className="sidebar" aria-label="Navigation">
        <div className="sidebar-head">
          <span className="brand" aria-hidden={collapsed}>
            DS-Studio <Badge variant="outline">v3</Badge>
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label={
              collapsed ? 'Déplier la navigation' : 'Replier la navigation'
            }
            aria-expanded={!collapsed}
            onClick={() => setCollapsed(!collapsed)}
          >
            <span aria-hidden="true">{collapsed ? '›' : '‹'}</span>
          </Button>
        </div>
        <nav>
          <ul>
            {pages.map((p) => {
              const available = ready.includes(p.id as Ready);
              return (
                <li key={p.id}>
                  <a
                    href={available ? `?vue=${p.id}` : undefined}
                    aria-current={page === p.id ? 'page' : undefined}
                    aria-disabled={available ? undefined : true}
                    title={available ? undefined : 'Bientôt dans la v3'}
                    onClick={(e) => {
                      if (!available) return;
                      e.preventDefault();
                      go(p.id as Ready);
                    }}
                  >
                    <span className="nav-initial" aria-hidden="true">
                      {p.label[0]}
                    </span>
                    <span className="nav-label">{p.label}</span>
                    {!available && <small className="nav-soon">bientôt</small>}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="sidebar-foot">
          <a className="back" href="/">
            Version actuelle
          </a>
        </div>
      </aside>
      <div className="main">
        <div className="topbar">
          <ToggleGroup
            label="Thème"
            value={theme === 'dark' ? 'dark' : 'light'}
            onChange={setTheme}
            options={[
              { value: 'light', label: 'Clair' },
              { value: 'dark', label: 'Sombre' },
            ]}
          />
        </div>
        <main>{page === 'brief' ? <Brief /> : <Dashboard />}</main>
      </div>
    </div>
  );
}
