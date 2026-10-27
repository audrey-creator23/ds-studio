import home from './icons/home.svg';
import page from './icons/page.svg';
import table from './icons/table.svg';
import calendar from './icons/calendar.svg';
import help from './icons/help.svg';
import Logo from './Logo.js';

// Pages : l'atelier reste monté (caché) quand une autre page s'affiche.
export type Page = 'home' | 'workshop' | 'assistant' | 'brief' | 'volcano';
// Adresse lisible de chaque page (?vue=…), conservée au rechargement.
export const pageSlugs: Record<Page, string> = {
  home: 'accueil',
  workshop: 'design',
  assistant: 'assistant',
  brief: 'brief',
  volcano: 'volcan',
};
export const pageTitles: Record<Page, string> = {
  home: 'Accueil',
  workshop: 'Design',
  assistant: 'Contexte & Assistant',
  brief: 'Brief du projet',
  volcano: 'Dashboard Volcan',
};
export const pageHeadings: Record<Exclude<Page, 'workshop'>, string> = {
  home: 'home-title',
  assistant: 'assistant-title',
  brief: 'projet-title',
  volcano: 'volcan-title',
};
const mainPages = [
  { id: 'home', label: 'Accueil', icon: home },
  { id: 'workshop', label: 'Design', icon: table },
  { id: 'assistant', label: 'Contexte & Assistant', emoji: '💬' },
] as const;
const projectPages = [
  { id: 'brief', label: 'Brief du projet', icon: page },
  { id: 'volcano', label: 'Dashboard Volcan', emoji: '🌋' },
] as const;

// Menu vertical du chrome, d'après le DS Figma de référence. Il n'utilise pas
// les tokens éditables : seul le DS change avec eux.
export default function Sidebar({
  revision,
  historyOpen,
  onToggleHistory,
  current,
  onPage,
  figmaLabel,
}: {
  revision: number;
  historyOpen: boolean;
  onToggleHistory: () => void;
  current: Page;
  onPage: (page: Page) => void;
  figmaLabel: string;
}) {
  const pageButton = (
    p: (typeof mainPages)[number] | (typeof projectPages)[number],
  ) => (
    <li key={p.id}>
      <button
        aria-current={current === p.id ? 'page' : undefined}
        onClick={() => onPage(p.id)}
      >
        {'icon' in p ? (
          <img src={p.icon} alt="" width="18" height="18" />
        ) : (
          <span className="sidebar-emoji" aria-hidden="true">
            {p.emoji}
          </span>
        )}
        {p.label}
      </button>
    </li>
  );
  return (
    <aside className="sidebar">
      <div className="sidebar-account">
        <Logo />
        <span>
          <strong>DS-Studio</strong>
          <small>Atelier de Design System</small>
        </span>
      </div>
      <nav aria-label="Panneaux de l’atelier">
        <ul className="sidebar-menu">{mainPages.map(pageButton)}</ul>
        <p className="sidebar-eyebrow">Projet</p>
        <ul className="sidebar-menu">{projectPages.map(pageButton)}</ul>
        <p className="sidebar-eyebrow">Suivi</p>
        <ul className="sidebar-menu">
          <li>
            <button onClick={onToggleHistory} aria-expanded={historyOpen}>
              <img src={calendar} alt="" width="18" height="18" />
              Historique · {revision}
            </button>
          </li>
        </ul>
      </nav>
      <div className="sidebar-footer">
        <span className="local-badge">● Local · V2</span>
        <span className="sidebar-status">
          <img src={help} alt="" width="18" height="18" />
          {figmaLabel}
        </span>
      </div>
    </aside>
  );
}
