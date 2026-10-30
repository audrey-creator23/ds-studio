import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  BookOpen,
  ClipboardList,
  Compass,
  Download,
  House,
  LayoutGrid,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Menu,
  Siren,
  TriangleAlert,
  UserRound,
} from 'lucide-react';
import { Button } from '../../app/v3/ui.js';
import { risks } from '../../app/v3/carte/risks.js';
import { reducedMotion } from '../../app/v3/carte/MapView.js';
import { useHome } from '../../app/v3/carte/Logement.js';
import Downloads, { readOffline } from '../../app/v3/carte/Downloads.js';
import Plan from '../../app/v3/carte/Plan.js';
import Danger from './Danger.js';
import Explore, { Where, mobile, type Sheet } from './Explore.js';
import Places, { type Place } from '../../app/v3/carte/Places.js';
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
  | 'shortcuts'
  | 'places'
  | 'profile';
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
  places: 'Mes lieux',
  profile: 'Profil et paramètres',
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
  // Barre continue 0 → 90 % en 2,4 s, puis 100 % seulement quand la page
  // est réellement prête (polices, ressources) : jamais de fin simulée.
  const bar = useRef<HTMLElement>(null);
  useEffect(() => {
    const reduced = reducedMotion();
    const ms = reduced ? 600 : 2600;
    let end: ReturnType<typeof setTimeout>;
    let raf = 0;
    let loaded = document.readyState === 'complete';
    let fontsReady = !document.fonts;
    const onLoad = () => {
      loaded = true;
    };
    if (!loaded) addEventListener('load', onLoad, { once: true });
    let live = true;
    void document.fonts?.ready.then(() => {
      if (live) fontsReady = true;
    });
    let previous = performance.now();
    let p = 0;
    const frame = (time: number) => {
      const dt = Math.min(100, Math.max(0, time - previous));
      previous = time;
      // Après une attente à 90 %, reprendre depuis cette valeur, sans
      // bond à 100 %. Aucun chargement terminé n'est simulé.
      p = Math.min(loaded && fontsReady ? 1 : 0.9, p + dt / ms);
      if (bar.current)
        bar.current.style.transform = `scaleX(${reduced && p < 1 ? 0 : p})`;
      if (p < 1) raf = requestAnimationFrame(frame);
      else end = setTimeout(onDone, reduced ? 0 : 150);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      live = false;
      cancelAnimationFrame(raf);
      clearTimeout(end);
      removeEventListener('load', onLoad);
    };
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
      <span className="m-loader" aria-hidden="true">
        <i ref={bar} style={{ transform: 'scaleX(0)', transition: 'none' }} />
      </span>
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
  { id: 'places', label: 'Mes lieux', icon: MapPin },
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
  // Carte : tiroir des risques (fermé sur mobile), lieu à placer, lieu à
  // recentrer, lieu à modifier.
  const [sheet, setSheet] = useState<Sheet>(() =>
    mobile() ? 'closed' : 'peek',
  );
  const [placing, setPlacing] = useState<Partial<Place> | null>(null);
  const [focusOn, setFocusOn] = useState<Place | null>(null);
  const [editId, setEditId] = useState<string>();
  const toMap = (s: Sheet) => {
    setSheet(s === 'closed' && !mobile() ? 'peek' : s);
    go(home ? 'explore' : 'where');
  };
  // Dock mobile : 5 actions, la dernière en pastille orange.
  const dock: {
    label: string;
    icon: typeof House;
    on: boolean;
    act: () => void;
  }[] = [
    {
      label: 'Carte',
      icon: MapIcon,
      on: screen === 'explore' && sheet === 'closed',
      act: () => toMap('closed'),
    },
    {
      label: 'Risques',
      icon: TriangleAlert,
      on: screen === 'explore' && sheet !== 'closed',
      act: () => toMap('half'),
    },
    {
      label: 'Mes lieux',
      icon: MapPin,
      on: screen === 'places' || screen === 'where',
      act: () => {
        setEditId(undefined);
        go('places');
      },
    },
    {
      label: 'Préparation et ressources',
      icon: ClipboardList,
      on: ['plan', 'offline', 'learn'].includes(screen),
      act: () => go('plan'),
    },
    {
      label: 'Profil et paramètres',
      icon: UserRound,
      on: ['profile', 'notifs', 'shortcuts'].includes(screen),
      act: () => go('profile'),
    },
  ];
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
      {screen === 'explore' && (
        <button
          type="button"
          className="m-menu-recenter"
          onClick={() => {
            dispatchEvent(new Event('pfe-recenter'));
            setMenu(false);
          }}
        >
          <LocateFixed size={18} aria-hidden="true" /> Recentrer la carte
        </button>
      )}
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
          {screen === 'explore' && (
            <Explore
              header={bar}
              sheet={sheet}
              onSheet={setSheet}
              placing={placing}
              onPlaced={() => setPlacing(null)}
              focusOn={focusOn}
              onEditPlace={(id) => {
                setEditId(id);
                go('places');
              }}
            />
          )}
          {screen === 'places' && (
            <div className="m-scroll">
              <Places
                key={editId}
                editId={editId}
                onFocus={(p) => {
                  setFocusOn(p);
                  toMap('closed');
                }}
                onPickOnMap={(d) => {
                  setPlacing(d);
                  toMap('closed');
                }}
              />
            </div>
          )}
          {screen === 'profile' && (
            <div className="m-scroll">
              <p className="small">
                Aucun compte : vos réglages et lieux restent sur cet appareil.
              </p>
              <nav className="m-menu m-menu--page" aria-label="Paramètres">
                {nav
                  .filter((n) =>
                    ['places', 'notifs', 'shortcuts', 'learn'].includes(n.id),
                  )
                  .map((n) => (
                    <button key={n.id} type="button" onClick={() => go(n.id)}>
                      <n.icon size={18} aria-hidden="true" /> {n.label}
                    </button>
                  ))}
              </nav>
            </div>
          )}
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
        {screen !== 'danger' && (
          <nav className="m-dock" aria-label="Navigation principale">
            {dock.map((n) => (
              <button
                key={n.label}
                type="button"
                aria-label={n.label}
                title={n.label}
                aria-current={n.on ? 'page' : undefined}
                onClick={n.act}
              >
                <n.icon size={20} strokeWidth={1.75} aria-hidden="true" />
              </button>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}
