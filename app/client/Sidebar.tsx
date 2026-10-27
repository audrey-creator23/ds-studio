import { useEffect, useState } from 'react';
import home from './icons/home.svg';
import page from './icons/page.svg';
import table from './icons/table.svg';
import compass from './icons/compass.svg';
import calendar from './icons/calendar.svg';
import help from './icons/help.svg';

// Menu vertical du chrome de l'atelier, d'après le DS Figma de référence.
// Il n'utilise pas les tokens éditables : seul le DS change avec eux.
const sections = [
  { id: 'accueil', label: 'Accueil', icon: home },
  { id: 'agent-title', label: 'Contexte et assistant', icon: page },
  { id: 'ds-title', label: 'Tokens et composants', icon: table },
  { id: 'mobile-title', label: 'Aperçu responsive', icon: compass },
];

export default function Sidebar({
  revision,
  historyOpen,
  onToggleHistory,
  figmaLabel,
}: {
  revision: number;
  historyOpen: boolean;
  onToggleHistory: () => void;
  figmaLabel: string;
}) {
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
        <span className="sidebar-avatar" aria-hidden="true">
          ds
        </span>
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
                aria-current={active === s.id ? 'location' : undefined}
                onClick={() => setActive(s.id)}
              >
                <img src={s.icon} alt="" width="18" height="18" />
                {s.label}
              </a>
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
