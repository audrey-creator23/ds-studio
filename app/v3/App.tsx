import { useEffect, useState } from 'react';
import Dashboard from './Dashboard.js';
import { Badge, Button } from './ui.js';

// Itération v3 : seule la page Dashboard existe pour l'instant. Les autres
// pages sont annoncées dans la navigation mais désactivées.
const pages = [
  { id: 'home', label: 'Accueil' },
  { id: 'design', label: 'Design' },
  { id: 'assistant', label: 'Contexte & Assistant' },
  { id: 'brief', label: 'Brief projet' },
  { id: 'dashboard', label: 'Dashboard' },
] as const;

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

export default function App() {
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
              const current = p.id === 'dashboard';
              return (
                <li key={p.id}>
                  <a
                    href={current ? '#page-title' : undefined}
                    aria-current={current ? 'page' : undefined}
                    aria-disabled={current ? undefined : true}
                    title={current ? undefined : 'Bientôt dans la v3'}
                  >
                    <span className="nav-initial" aria-hidden="true">
                      {p.label[0]}
                    </span>
                    <span className="nav-label">{p.label}</span>
                    {!current && <small className="nav-soon">bientôt</small>}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="sidebar-foot">
          <Button
            variant="outline"
            size="sm"
            aria-pressed={theme === 'dark'}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? 'Thème sombre' : 'Thème clair'}
          </Button>
          <a className="back" href="/">
            Version actuelle
          </a>
        </div>
      </aside>
      <main className="main">
        <Dashboard />
      </main>
    </div>
  );
}
