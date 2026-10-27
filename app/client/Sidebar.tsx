import home from './icons/home.svg';
import page from './icons/page.svg';
import table from './icons/table.svg';
import calendar from './icons/calendar.svg';
import help from './icons/help.svg';
import { NavLink, Tooltip } from '@mantine/core';
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

// Lien de menu : NavLink Mantine ; réduit, le libellé passe en infobulle et
// reste le nom accessible du bouton.
function MenuItem({
  label,
  icon,
  collapsed,
  ...props
}: {
  label: string;
  icon: React.ReactNode;
  collapsed: boolean;
  active?: boolean;
  onClick: () => void;
  'aria-current'?: 'page';
  'aria-expanded'?: boolean;
}) {
  return (
    <li>
      <Tooltip label={label} position="right" disabled={!collapsed}>
        <NavLink
          component="button"
          type="button"
          className="sidebar-link"
          label={label}
          leftSection={icon}
          {...props}
        />
      </Tooltip>
    </li>
  );
}

// Menu vertical du chrome, d'après le DS Figma de référence. Il n'utilise pas
// les tokens éditables : seul le DS change avec eux. Rétractable sur grand
// écran ; sous 1000 px il devient une barre horizontale.
export default function Sidebar({
  revision,
  historyOpen,
  onToggleHistory,
  current,
  onPage,
  figmaLabel,
  collapsed,
  onCollapse,
}: {
  revision: number;
  historyOpen: boolean;
  onToggleHistory: () => void;
  current: Page;
  onPage: (page: Page) => void;
  figmaLabel: string;
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}) {
  const pageButton = (
    p: (typeof mainPages)[number] | (typeof projectPages)[number],
  ) => (
    <MenuItem
      key={p.id}
      label={p.label}
      collapsed={collapsed}
      active={current === p.id}
      aria-current={current === p.id ? 'page' : undefined}
      onClick={() => onPage(p.id)}
      icon={
        'icon' in p ? (
          <img src={p.icon} alt="" width="18" height="18" />
        ) : (
          <span className="sidebar-emoji" aria-hidden="true">
            {p.emoji}
          </span>
        )
      }
    />
  );
  return (
    <aside className={`sidebar${collapsed ? ' is-collapsed' : ''}`}>
      <div className="sidebar-account">
        <Logo />
        <span className="sidebar-brand">
          <strong>DS-Studio</strong>
          <small>Atelier de Design System</small>
        </span>
        <Tooltip label={collapsed ? 'Déplier le menu' : 'Réduire le menu'}>
          <button
            type="button"
            className="sidebar-collapse"
            aria-label={collapsed ? 'Déplier le menu' : 'Réduire le menu'}
            aria-expanded={!collapsed}
            onClick={() => onCollapse(!collapsed)}
          >
            <span aria-hidden="true">{collapsed ? '»' : '«'}</span>
          </button>
        </Tooltip>
      </div>
      <nav aria-label="Panneaux de l’atelier">
        <ul className="sidebar-menu">{mainPages.map(pageButton)}</ul>
        <p className="sidebar-eyebrow">Projet</p>
        <ul className="sidebar-menu">{projectPages.map(pageButton)}</ul>
        <p className="sidebar-eyebrow">Suivi</p>
        <ul className="sidebar-menu">
          <MenuItem
            label={`Historique · ${revision}`}
            collapsed={collapsed}
            active={historyOpen}
            aria-expanded={historyOpen}
            onClick={onToggleHistory}
            icon={<img src={calendar} alt="" width="18" height="18" />}
          />
        </ul>
      </nav>
      <div className="sidebar-footer">
        <span className="local-badge">● Local · V2</span>
        <span className="sidebar-status" title={figmaLabel}>
          <img src={help} alt="" width="18" height="18" />
          <span className="sidebar-status-label">{figmaLabel}</span>
        </span>
      </div>
    </aside>
  );
}
