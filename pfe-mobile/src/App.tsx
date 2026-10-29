import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  BookOpen,
  ClipboardList,
  Compass,
  Download,
  House,
  LayoutGrid,
  MapPin,
  Menu,
  Siren,
} from 'lucide-react';
import { Button } from '../../app/v3/ui.js';
import { risks } from '../../app/v3/carte/risks.js';
import { reducedMotion } from '../../app/v3/carte/MapView.js';
import { useHome } from '../../app/v3/carte/Logement.js';
import Downloads, { readOffline } from '../../app/v3/carte/Downloads.js';
import Plan from '../../app/v3/carte/Plan.js';
import Danger from './Danger.js';
import Explore, { Where } from './Explore.js';
import { Notifications, Shortcuts } from './Settings.js';

// Prototype de l'application mobile du PFE. Parcours : lancement →
// accueil (« Je suis en danger » / « Explorer les risques ») → urgence ou
// carte (après « Où êtes-vous ? ») ; menu : position, ressources hors
// ligne, plan d'urgence, comprendre les alertes, notifications,
// raccourcis ; liens directs par ancre (#danger…). Données et composants
// partagés avec DS-Studio (aucune copie) ; rien n'est simulé : appels et
// messages passent par le téléphone.
type Screen =
  | 'splash'
  | 'home'
  | 'danger'
  | 'where'
  | 'explore'
  | 'offline'
  | 'plan'
  | 'learn'
  | 'notifs'
  | 'shortcuts';
const titles: Record<Screen, string> = {
  splash: '',
  home: 'Accueil',
  danger: 'Je suis en danger',
  explore: 'Explorer les risques',
  offline: 'Ressources hors ligne',
  plan: 'Mon plan d’urgence',
  learn: 'Comprendre les alertes',
  where: 'Où êtes-vous ?',
  notifs: 'Notifications',
  shortcuts: 'Widgets & raccourcis',
};
// Liens directs (raccourcis) : #danger, #explore, #offline, #plan…
const fromHash = (): Screen | null => {
  const h = location.hash.slice(1) as Screen;
  return h in titles && h !== 'splash' ? h : null;
};

function Splash({
  onDone,
  onUrgent,
}: {
  onDone: () => void;
  onUrgent: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, reducedMotion() ? 600 : 2400);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div
      className="m-splash"
      role="status"
      aria-label="Chargement de l’application"
    >
      <span className="m-logo" aria-hidden="true">
        🌋
      </span>
      <div className="m-splash-text">
        <b>Risques Martinique</b>
        <small>Prototype PFE</small>
      </div>
      <span className="m-loader" aria-hidden="true" />
      <button type="button" className="m-urgent" onClick={onUrgent}>
        <Siren size={18} aria-hidden="true" /> Je suis en danger
      </button>
    </div>
  );
}

function Offline() {
  const [open, setOpen] = useState<string>();
  const [content, setContent] = useState<unknown>();
  useEffect(() => {
    if (open) void readOffline(open).then(setContent);
  }, [open]);
  return (
    <div className="m-scroll">
      <p className="small">
        Choisissez ce que vous voulez garder sur ce téléphone, consultable sans
        réseau.
      </p>
      <Downloads />
      <h2>Consulter</h2>
      <div className="vig-tags">
        {['consignes', 'contacts', 'trousse'].map((id) => (
          <button
            key={id}
            type="button"
            className="vig-tag"
            aria-pressed={open === id}
            onClick={() => setOpen(id)}
          >
            {
              {
                consignes: 'Consignes',
                contacts: 'Contacts',
                trousse: 'Trousse',
              }[id]
            }
          </button>
        ))}
      </div>
      {open && (
        <pre className="m-offline" aria-label="Contenu hors ligne">
          {content
            ? JSON.stringify(content, null, 1).replace(/[{}[\]",]/g, '')
            : 'Pas encore téléchargé.'}
        </pre>
      )}
    </div>
  );
}

function Learn() {
  return (
    <div className="m-scroll">
      {risks.map((r) => (
        <details key={r.id}>
          <summary>
            <r.icon size={15} aria-hidden="true" /> {r.label}
          </summary>
          <p className="small">{r.causes}</p>
          <p className="small">{r.consequences}</p>
          <ul className="carte-list">
            {r.pendant.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
          <small className="carte-stamp">Source : {r.official.org}</small>
        </details>
      ))}
      <small className="carte-stamp">
        Niveaux de vigilance : vert, jaune, orange, rouge, violet (cyclone) ;
        gris = non disponible, jamais assimilé au vert.
      </small>
    </div>
  );
}

const nav: { id: Screen; label: string; icon: typeof House }[] = [
  { id: 'home', label: 'Accueil', icon: House },
  { id: 'where', label: 'Ma position', icon: MapPin },
  { id: 'offline', label: 'Ressources hors ligne', icon: Download },
  { id: 'plan', label: 'Mon plan d’urgence', icon: ClipboardList },
  { id: 'learn', label: 'Comprendre les alertes', icon: BookOpen },
  { id: 'notifs', label: 'Notifications', icon: Bell },
  { id: 'shortcuts', label: 'Widgets & raccourcis', icon: LayoutGrid },
];

export default function App() {
  // Un lien direct ouvre la rubrique sans attendre le lancement.
  const [screen, setScreen] = useState<Screen>(() => fromHash() ?? 'splash');
  const home = useHome();
  useEffect(() => {
    const on = () => {
      const h = fromHash();
      if (h) setScreen(h);
    };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  const [menu, setMenu] = useState(false);
  const go = (s: Screen) => {
    setScreen(s);
    setMenu(false);
  };
  const done = useMemo(
    () => () => setScreen((s) => (s === 'splash' ? 'home' : s)),
    [],
  );
  // Menu : fermeture par Échap ou clic à l'extérieur.
  useEffect(() => {
    if (!menu) return;
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
    const out = (e: PointerEvent) =>
      !(e.target as HTMLElement).closest('.m-menu, .m-burger') &&
      setMenu(false);
    addEventListener('keydown', key);
    addEventListener('pointerdown', out);
    return () => {
      removeEventListener('keydown', key);
      removeEventListener('pointerdown', out);
    };
  }, [menu]);
  const toExplore = useMemo(() => () => setScreen('explore'), []);
  if (screen === 'splash')
    return <Splash onDone={done} onUrgent={() => setScreen('danger')} />;
  const bar = (
    <header className="m-bar">
      <Button
        variant="outline"
        size="icon"
        className="m-burger"
        aria-label="Menu"
        title="Menu"
        aria-expanded={menu}
        onClick={() => setMenu(!menu)}
      >
        <Menu size={18} aria-hidden="true" />
      </Button>
      {screen !== 'home' && screen !== 'explore' && <h1>{titles[screen]}</h1>}
    </header>
  );
  const links = (
    <nav className="m-menu" aria-label="Menu">
      {nav.map((n) => (
        <button
          key={n.id}
          type="button"
          aria-current={screen === n.id ? 'page' : undefined}
          onClick={() => go(n.id)}
        >
          <n.icon size={18} aria-hidden="true" /> {n.label}
        </button>
      ))}
    </nav>
  );
  return (
    <div className="m-app" data-screen={screen}>
      <aside className="m-side">{links}</aside>
      <div className="m-frame">
        {screen !== 'explore' && bar}
        {menu && <div className="m-drop">{links}</div>}
        <main className="m-main">
          {screen === 'home' && (
            <div className="m-home">
              <h1 className="m-hello">Que voulez-vous faire ?</h1>
              <button
                type="button"
                className="m-cta m-cta--danger"
                onClick={() => go('danger')}
              >
                <Siren size={24} aria-hidden="true" />
                <span>
                  <b>Je suis en danger</b>
                  <small>
                    Appeler, savoir quoi faire, prévenir mes proches
                  </small>
                </span>
              </button>
              <button
                type="button"
                className="m-cta"
                onClick={() => go(home ? 'explore' : 'where')}
              >
                <Compass size={24} aria-hidden="true" />
                <span>
                  <b>Explorer les risques</b>
                  <small>Carte de l’île et alertes du jour</small>
                </span>
              </button>
            </div>
          )}
          {screen === 'danger' && <Danger />}
          {screen === 'explore' && <Explore header={bar} />}
          {screen === 'where' && <Where onDone={toExplore} />}
          {screen === 'notifs' && <Notifications />}
          {screen === 'shortcuts' && (
            <Shortcuts onTest={(h) => go(h as Screen)} />
          )}
          {screen === 'offline' && <Offline />}
          {screen === 'plan' && (
            <div className="m-scroll">
              <Plan />
            </div>
          )}
          {screen === 'learn' && <Learn />}
        </main>
      </div>
    </div>
  );
}
