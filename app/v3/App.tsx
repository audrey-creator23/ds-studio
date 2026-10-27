import { useEffect, useState, type ComponentType } from 'react';
import {
  FileText,
  LayoutDashboard,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  PenTool,
  type LucideProps,
} from 'lucide-react';
import { AssistantProvider } from '../client/useAssistantChat.js';
import type { Page } from '../client/Sidebar.js';
import Dashboard from './Dashboard.js';
import Brief from './Brief.js';
import Studio from './Studio.js';
import Bubble from './Bubble.js';
import Schemas from './Schemas.js';
import { Button, ToggleGroup } from './ui.js';

// Interface v3, servie sur /. Le Dashboard est la page d'accueil ; Claude est
// accessible partout via la bulle. ?vue=… garde la page au rechargement.
type Ready = 'dashboard' | 'design' | 'brief' | 'schemas';
const pages: {
  id: Ready;
  label: string;
  icon: ComponentType<LucideProps>;
  context: Page;
}[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    context: 'volcano',
  },
  { id: 'design', label: 'Design', icon: PenTool, context: 'workshop' },
  { id: 'brief', label: 'Fiche PFE', icon: FileText, context: 'brief' },
  { id: 'schemas', label: 'Mes schémas', icon: Network, context: 'brief' },
];
const ready = pages.map((p) => p.id);

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
  const current = pages.find((p) => p.id === page)!;

  return (
    <AssistantProvider page={current.context}>
      <div
        className="shell"
        data-nav={collapsed ? 'closed' : 'open'}
        data-page={page}
      >
        <a className="skip" href="#page-title">
          Aller au contenu
        </a>
        <aside className="sidebar" aria-label="Navigation">
          <div className="sidebar-head">
            <span className="brand" role="img" aria-label="DS-Studio">
              🌋
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
              {collapsed ? (
                <PanelLeftOpen size={16} aria-hidden="true" />
              ) : (
                <PanelLeftClose size={16} aria-hidden="true" />
              )}
            </Button>
          </div>
          <nav>
            <ul>
              {pages.map((p) => {
                const Icon = p.icon;
                return (
                  <li key={p.id}>
                    <a
                      href={`?vue=${p.id}`}
                      aria-current={page === p.id ? 'page' : undefined}
                      title={collapsed ? p.label : undefined}
                      onClick={(e) => {
                        e.preventDefault();
                        go(p.id);
                      }}
                    >
                      <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                      <span className="nav-label">{p.label}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
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
          <main>
            {page === 'brief' ? (
              <Brief />
            ) : page === 'design' ? (
              <Studio scheme={theme === 'dark' ? 'dark' : 'light'} />
            ) : page === 'schemas' ? (
              <Schemas />
            ) : (
              <Dashboard />
            )}
          </main>
        </div>
        <Bubble pageLabel={current.label} />
      </div>
    </AssistantProvider>
  );
}
