import { useEffect, useState } from 'react';
import home from './icons/home.svg';
import page from './icons/page.svg';
import table from './icons/table.svg';
import compass from './icons/compass.svg';
import calendar from './icons/calendar.svg';
import help from './icons/help.svg';
import Logo from './Logo.js';

// Pages secondaires : elles remplacent l'atelier sans le démonter.
export type Page = 'workshop' | 'assistant' | 'brief' | 'volcano';
export const pageTitles: Record<Page, string> = {
  workshop: 'Lisière',
  assistant: 'Contexte & Assistant',
  brief: 'Brief du projet',
  volcano: 'Dashboard Volcan',
};
export const pageHeadings: Record<Exclude<Page, 'workshop'>, string> = {
  assistant: 'assistant-title',
  brief: 'projet-title',
  volcano: 'volcan-title',
};
const projectPages = [
  { id: 'brief', label: 'Brief du projet', icon: page },
  { id: 'volcano', label: 'Dashboard Volcan', emoji: '🌋' },
] as const;

// Menu vertical du chrome de l'atelier, d'après le DS Figma de référence.
// Il n'utilise pas les tokens éditables : seul le DS change avec eux.
const sections = [
  { id: 'accueil', label: 'Accueil', icon: home },
  { id: 'ds-title', label: 'Tokens et composants', icon: table },
  { id: 'mobile-title', label: 'Aperçu responsive', icon: compass },
];

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
  const away = current !== 'workshop';
  const [active, setActive] = useState('accueil');
  useEffect(() => {
    const targets = sections
      .map((s) => document.getElementById(s.id))
      .filter((t): t is HTMLElement => !!t);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting);
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: '0px 0px -70% 0px' },
    );
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, []);
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
        <ul className="sidebar-menu">
          {sections.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                aria-current={!away && active === s.id ? 'location' : undefined}
                onClick={(e) => {
                  if (away) {
                    e.preventDefault();
                    onPage('workshop');
                    requestAnimationFrame(() =>
                      document.getElementById(s.id)?.scrollIntoView(),
                    );
                  }
                  setActive(s.id);
                }}
              >
                <img src={s.icon} alt="" width="18" height="18" />
                {s.label}
              </a>
            </li>
          ))}
          <li>
            <button
              aria-current={current === 'assistant' ? 'page' : undefined}
              onClick={() =>
                onPage(current === 'assistant' ? 'workshop' : 'assistant')
              }
            >
              <span className="sidebar-emoji" aria-hidden="true">
                💬
              </span>
              Contexte & Assistant
            </button>
          </li>
        </ul>
        <p className="sidebar-eyebrow">Projet</p>
        <ul className="sidebar-menu">
          {projectPages.map((p) => (
            <li key={p.id}>
              <button
                aria-current={current === p.id ? 'page' : undefined}
                onClick={() => onPage(current === p.id ? 'workshop' : p.id)}
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
          ))}
        </ul>
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
