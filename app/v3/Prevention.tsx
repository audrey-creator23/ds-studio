import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Crosshair,
  House,
  ExternalLink,
  Info,
  Layers,
  Lock,
  Pause,
  Play,
  Tornado,
} from 'lucide-react';
import { Button, ToggleGroup } from './ui.js';
import { dataSources, risks, type RiskId } from './carte/risks.js';
import MapView, {
  FicheView,
  levelNames,
  reducedMotion,
  type Pin,
} from './carte/MapView.js';
import Logement, { HomeFacts, useHome } from './carte/Logement.js';
import Preparer from './carte/Preparer.js';
import Downloads from './carte/Downloads.js';
import Plan from './carte/Plan.js';
import Device from './studio/Device.js';
import Coupe from './carte/Coupe.js';
import type { CarteScene, Exposure, Hover, Volcano } from './carte/scene.js';
import type { Go } from './Carte.js';

// Prévention & ressources : comprendre les risques (simulations 3D
// pédagogiques), me préparer (trousse), mon logement (adresse privée,
// exposition géographique). Situation officielle : page Carte interactive.
type Tab = 'prototype' | 'preparer' | 'comprendre' | 'logement';
const tabs: { id: Tab; label: string }[] = [
  { id: 'prototype', label: 'Prototype de l’application' },
  { id: 'preparer', label: 'Me préparer' },
  { id: 'comprendre', label: 'Comprendre les risques' },
  { id: 'logement', label: 'Mon logement' },
];
const phenomena: { value: Volcano['phenomenon']; label: string }[] = [
  { value: 'panache', label: 'Panache et cendres' },
  { value: 'nuee', label: 'Nuée ardente' },
  { value: 'projections', label: 'Projections' },
];
// Échelle de vigilance officielle (pédagogie, pas une donnée du jour).
const vigilance = [
  ['vert', 'Vert', 'Pas de vigilance particulière'],
  ['jaune', 'Jaune', 'Soyez attentif'],
  ['orange', 'Orange', 'Soyez très vigilant'],
  ['rouge', 'Rouge', 'Vigilance absolue'],
  ['violet', 'Violet', 'Confinement (cyclone)'],
  ['na', 'Gris', 'Non disponible : aucune donnée publiée'],
] as const;
const compass = (deg: number) =>
  [
    'nord',
    'nord-est',
    'est',
    'sud-est',
    'sud',
    'sud-ouest',
    'ouest',
    'nord-ouest',
  ][Math.round(deg / 45) % 8];
const fromUrl = (): Tab => {
  const t = new URLSearchParams(location.search).get('onglet');
  return t === 'preparer' || t === 'logement' || t === 'comprendre'
    ? t
    : 'prototype';
};

export default function Prevention({ go }: { go: Go }) {
  const [tab, setTab] = useState<Tab>(fromUrl);
  const [sim, setSim] = useState<RiskId | null>(null);
  const [fiche, setFiche] = useState<{
    title: string;
    rows: [string, string][];
  }>();
  const [track, setTrack] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [volcano, setVolcano] = useState<Volcano>({
    phenomenon: 'panache',
    wind: 270,
    intensity: 2,
  });
  const [brume, setBrume] = useState<1 | 2 | 3>(2);
  const [coupe, setCoupe] = useState(false);
  const [engine, setEngine] = useState<CarteScene | null>(null);
  const [exposure, setExposure] = useState<Exposure | null>(null);
  const [homeLevel, setHomeLevel] = useState(0);
  const home = useHome();
  const phone = useRef<HTMLIFrameElement>(null);
  const reduced = reducedMotion();
  const current =
    tab === 'comprendre' ? risks.find((r) => r.id === sim) : undefined;
  useEffect(() => {
    const url = new URL(location.href);
    url.searchParams.set('onglet', tab);
    history.replaceState(null, '', url);
  }, [tab]);
  useEffect(() => {
    setExposure(home && engine ? engine.exposure(home.lat, home.lon) : null);
  }, [home, engine]);
  // Niveau SIMULÉ au logement, après mise à jour des zones par la carte.
  useEffect(() => {
    const t = requestAnimationFrame(() =>
      setHomeLevel(home && engine ? engine.zoneLevel(home.lat, home.lon) : 0),
    );
    return () => cancelAnimationFrame(t);
  }, [home, engine, sim, volcano]);

  const toRows = (f: (typeof risks)[number]['zone']): [string, string][] => [
    ['Quoi', f.quoi],
    ['Où', f.ou],
    ['Risque', f.risque],
    ['Conséquences', f.consequences],
    ['Prévention', f.prevention],
    ['Source', f.source],
  ];
  const pins: Pin[] = [
    ...(current?.markers ?? []).map((m) => ({
      ...m,
      icon: m.id === 'epi-2007' ? Crosshair : current!.icon,
      onClick: () => setFiche({ title: m.label, rows: toRows(m.fiche) }),
    })),
    ...(tab === 'comprendre' && sim === 'cyclone'
      ? [
          {
            id: 'cyclone-eye',
            lat: 0,
            lon: 0,
            label: 'Œil (trajectoire fictive)',
            icon: Tornado,
            kind: 'eye' as const,
          },
        ]
      : []),
    // Balise du logement : sur la Carte interactive seulement.
  ];
  const pickZone = (h: Hover) => {
    if (!current) return;
    setFiche({
      title: `${current.label} · zone simulée ${levelNames[h.level - 1]}`,
      rows: toRows({
        ...current.zone,
        ou: `${current.zone.ou} Point choisi : ${h.lat.toFixed(3)}° N, ${Math.abs(h.lon).toFixed(3)}° O, altitude ${h.alt} m.`,
      }),
    });
  };

  return (
    <div className="page carte">
      <header className="page-header">
        <h1 id="page-title" tabIndex={-1}>
          Prévention & ressources
        </h1>
        <p className="lead">
          Comprendre chaque risque avec des simulations, préparer sa trousse
          d’urgence et connaître l’exposition de son logement.
        </p>
      </header>
      <section
        className="card carte-card"
        aria-label="Prévention et ressources"
      >
        <div className="carte-head">
          <div
            className="tabs carte-tabs"
            role="tablist"
            aria-label="Rubriques"
          >
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`prev-tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls="prev-panel"
                onClick={() => {
                  setTab(t.id);
                  setFiche(undefined);
                  setCoupe(false);
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => go('carte')}>
            <ArrowLeft size={14} aria-hidden="true" /> Situation actuelle
          </Button>
        </div>
        <div
          className={`carte-body${tab === 'preparer' ? ' carte-body--full' : ''}`}
        >
          {tab === 'prototype' && (
            <div className="carte-stage proto-stage">
              <Device
                view={{ device: 'mobile', w: 393, h: 852, zoom: 'fit' }}
                onView={() => {}}
                scheme={
                  document.documentElement.classList.contains('dark')
                    ? 'dark'
                    : 'light'
                }
                proposal={false}
                onSelect={() => {}}
                onDrop={() => {}}
                frameRef={phone}
                src="/pfe/"
              />
            </div>
          )}
          {(tab === 'comprendre' || tab === 'logement') && (
            <MapView
              risk={tab === 'comprendre' ? sim : null}
              volcano={volcano}
              brume={brume}
              cycloneT={playing && !reduced ? null : track / 100}
              pins={pins}
              hintLabel={current?.label}
              onPickZone={pickZone}
              onCyclone={(t) => setTrack(Math.round(t * 100))}
              onEngine={setEngine}
              fallback={
                <>
                  <p>
                    La 3D (WebGL) n’est pas disponible sur cet appareil. Les
                    fiches restent consultables :
                  </p>
                  <ul>
                    {risks.map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          className="link"
                          onClick={() =>
                            setFiche({ title: r.label, rows: toRows(r.zone) })
                          }
                        >
                          {r.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              }
              top={
                tab === 'comprendre' ? (
                  <div
                    className="toggle-group carte-risks"
                    role="group"
                    aria-label="Simulation affichée"
                  >
                    {risks.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        aria-pressed={sim === r.id}
                        title={sim === r.id ? `Retirer : ${r.label}` : r.label}
                        onClick={() => {
                          setSim(sim === r.id ? null : r.id);
                          setFiche(undefined);
                          setCoupe(false);
                        }}
                      >
                        <r.icon size={14} aria-hidden="true" />
                        <span>{r.label}</span>
                      </button>
                    ))}
                  </div>
                ) : undefined
              }
              bottom={
                <div className="carte-note">
                  {tab === 'comprendre' && (
                    <span className="carte-badge">
                      <Info size={13} aria-hidden="true" /> Simulation
                      pédagogique : ni prévision ni alerte
                    </span>
                  )}
                  <details>
                    <summary>Sources</summary>
                    <ul>
                      {dataSources.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                      <li>
                        Zones, intensités et trajectoires simulées : hypothèses
                        de calcul, pas les cartes officielles.
                      </li>
                    </ul>
                  </details>
                </div>
              }
            >
              {fiche && (
                <FicheView
                  title={fiche.title}
                  rows={fiche.rows}
                  onClose={() => setFiche(undefined)}
                />
              )}
              {coupe && (
                <Coupe reduced={reduced} onClose={() => setCoupe(false)} />
              )}
            </MapView>
          )}
          <aside
            id="prev-panel"
            className="carte-panel"
            role="tabpanel"
            aria-labelledby={`prev-tab-${tab}`}
          >
            {tab === 'prototype' && (
              <div className="carte-panel-body">
                <h3>Prototype de l’application</h3>
                <p className="small">
                  Vraie application React (dossier <code>pfe-mobile/</code>),
                  affichée dans un cadre iPhone 15 Pro (393 × 852 pt, Dynamic
                  Island, zones sûres). Cliquez, naviguez : tout est interactif.
                </p>
                <p className="carte-explain">
                  <Info size={14} aria-hidden="true" /> Maquette dans le
                  navigateur, pas le simulateur iOS d’Xcode : le rendu Safari
                  réel, les gestes et les autorisations du téléphone peuvent
                  différer.
                </p>
                <a
                  className="carte-link"
                  href="/pfe/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Ouvrir l’application seule{' '}
                  <ExternalLink size={12} aria-hidden="true" />
                  <span className="sr-only"> (nouvel onglet)</span>
                </a>
                <small className="carte-stamp">
                  Modifications visibles immédiatement (HMR) en lançant
                  DS-Studio en mode développement : <code>npm run dev</code>. DA
                  actuelle : <code>pfe-mobile/src/theme/current/</code> ; future
                  DA : <code>theme/future/</code> (à définir).
                </small>
              </div>
            )}
            {tab === 'preparer' && (
              <div className="carte-panel-body prep-grid">
                <section
                  className="carte-block prep-card"
                  aria-label="Télécharger mes ressources d’urgence"
                >
                  <h3>Télécharger mes ressources d’urgence</h3>
                  <Downloads />
                </section>
                <section
                  className="carte-block prep-card"
                  aria-label="Mon plan d’urgence"
                >
                  <h3>Mon plan d’urgence</h3>
                  <Plan />
                </section>
                <section
                  className="prep-wide"
                  aria-label="Ma trousse d’urgence"
                >
                  <Preparer />
                </section>
              </div>
            )}
            {tab === 'logement' && (
              <div className="carte-panel-body">
                <Logement home={home} />
                <p className="carte-explain">
                  <Lock size={14} aria-hidden="true" /> Votre adresse reste sur
                  cet appareil. Elle n’est envoyée qu’au service public Base
                  Adresse Nationale, avec votre accord, pour la localiser.
                </p>
                {home && <HomeFacts home={home} exposure={exposure} />}
              </div>
            )}
            {tab === 'comprendre' && !current && (
              <div className="carte-panel-body">
                <p>
                  Choisissez un risque au-dessus de la carte : la simulation
                  s’affiche en 3D, avec ses causes, ses conséquences et les bons
                  gestes.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCoupe(true)}
                >
                  <Layers size={14} aria-hidden="true" /> Voir la coupe :
                  séismes et tsunamis
                </Button>
                <section
                  className="carte-block"
                  aria-label="Comprendre les niveaux de vigilance"
                >
                  <h3>Comprendre les niveaux de vigilance</h3>
                  <p className="small muted">
                    Couleurs publiées par les autorités (Météo-France,
                    préfecture) ; la Carte interactive ne les affiche que si
                    elles sont publiées en données ouvertes.
                  </p>
                  <ul className="vig-scale">
                    {vigilance.map(([c, label, t]) => (
                      <li key={c}>
                        <i data-vigilance={c} /> <b>{label}</b> {t}
                      </li>
                    ))}
                  </ul>
                  <p className="small">
                    <b>Séismes observés (USGS)</b> : chaque point est un séisme
                    enregistré ; sa couleur indique la profondeur du foyer
                    (rouge &lt; 30 km, orange 30 à 100 km, jaune &gt; 100 km).
                    C’est une observation, jamais un niveau de vigilance.
                  </p>
                  <p className="small muted">
                    Chaque risque garde ses propres nuances (par exemple violet
                    = confinement, propre aux cyclones). Les couleurs des
                    simulations (jaune, orange, rouge « simulés ») sont une
                    légende pédagogique, distincte de la vigilance réelle.
                  </p>
                </section>
              </div>
            )}
            {current && (
              <div className="carte-panel-body">
                <h3>
                  <current.icon size={15} aria-hidden="true" /> {current.label}
                </h3>
                {sim === 'volcan' && (
                  <fieldset className="carte-scenario">
                    <legend>Scénario hypothétique</legend>
                    <ToggleGroup
                      label="Phénomène"
                      value={volcano.phenomenon}
                      onChange={(v) =>
                        setVolcano({ ...volcano, phenomenon: v })
                      }
                      options={phenomena.map((p) => ({
                        value: p.value,
                        label: p.label,
                        title: p.label,
                      }))}
                    />
                    <label>
                      Intensité :{' '}
                      {['faible', 'moyenne', 'forte'][volcano.intensity - 1]}
                      <input
                        type="range"
                        min={1}
                        max={3}
                        value={volcano.intensity}
                        onChange={(e) =>
                          setVolcano({
                            ...volcano,
                            intensity: Number(e.target.value) as 1 | 2 | 3,
                          })
                        }
                      />
                    </label>
                    {volcano.phenomenon === 'panache' && (
                      <label>
                        Vent vers le {compass(volcano.wind)}
                        <input
                          type="range"
                          min={0}
                          max={315}
                          step={45}
                          value={volcano.wind}
                          onChange={(e) =>
                            setVolcano({
                              ...volcano,
                              wind: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                    )}
                    {volcano.phenomenon === 'nuee' && (
                      <small className="carte-stamp">
                        Une nuée réelle dévale à plusieurs centaines de km/h :
                        l’animation est très ralentie.
                      </small>
                    )}
                  </fieldset>
                )}
                {sim === 'brume' && (
                  <fieldset className="carte-scenario">
                    <legend>Scénario hypothétique</legend>
                    <label>
                      Densité de poussières :{' '}
                      {['faible', 'moyenne', 'forte'][brume - 1]}
                      <input
                        type="range"
                        min={1}
                        max={3}
                        value={brume}
                        onChange={(e) =>
                          setBrume(Number(e.target.value) as 1 | 2 | 3)
                        }
                      />
                    </label>
                  </fieldset>
                )}
                {sim === 'cyclone' && (
                  <div className="carte-track">
                    <Button
                      variant="outline"
                      size="icon"
                      title={playing ? 'Pause' : 'Lecture'}
                      aria-label={
                        playing
                          ? 'Mettre en pause le déplacement'
                          : 'Animer le déplacement'
                      }
                      onClick={() => setPlaying(!playing)}
                    >
                      {playing ? (
                        <Pause size={14} aria-hidden="true" />
                      ) : (
                        <Play size={14} aria-hidden="true" />
                      )}
                    </Button>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={track}
                      aria-label="Position de l’œil sur la trajectoire fictive"
                      onChange={(e) => {
                        setPlaying(false);
                        setTrack(Number(e.target.value));
                      }}
                    />
                  </div>
                )}
                <div
                  className="carte-legend carte-legend--inline"
                  role="group"
                  aria-label={`Légende : ${current.label}`}
                >
                  <strong>Niveaux simulés</strong>
                  <ul>
                    {current.legend.map((text, i) => (
                      <li key={i}>
                        <i data-level={i + 1} /> <b>{levelNames[i]}</b> {text}
                      </li>
                    ))}
                  </ul>
                  <p>{current.hypothesis}</p>
                </div>
                {home && sim !== 'brume' && (
                  <p className="carte-home-sim">
                    <House size={14} aria-hidden="true" /> Votre logement, dans
                    cette simulation :{' '}
                    <b>
                      {homeLevel
                        ? `zone simulée ${levelNames[homeLevel - 1]}`
                        : 'hors des zones simulées'}
                    </b>
                    . Ce n’est pas un niveau officiel.
                  </p>
                )}
                <h4>Pourquoi ?</h4>
                <p>{current.causes}</p>
                <h4>Conséquences</h4>
                <p>{current.consequences}</p>
                <h4>Les bons gestes</h4>
                {(['avant', 'pendant', 'apres'] as const).map((k) => (
                  <details key={k} open={k === 'pendant'}>
                    <summary>
                      {
                        { avant: 'Avant', pendant: 'Pendant', apres: 'Après' }[
                          k
                        ]
                      }
                    </summary>
                    <ul className="carte-list">
                      {current[k].map((g) => (
                        <li key={g}>{g}</li>
                      ))}
                    </ul>
                  </details>
                ))}
                {(sim === 'seisme' ||
                  sim === 'tsunami' ||
                  sim === 'volcan') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCoupe(true)}
                  >
                    <Layers size={14} aria-hidden="true" /> Voir la coupe sous
                    l’île
                  </Button>
                )}
              </div>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}
