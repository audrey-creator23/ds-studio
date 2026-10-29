import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, House, MapPin } from 'lucide-react';
import { Button } from './ui.js';
import { dataSources, risks, type RiskId } from './carte/risks.js';
import MapView, { levelNames, type Pin } from './carte/MapView.js';
import Logement, { useHome } from './carte/Logement.js';
import Locate from './carte/Locate.js';
import Proches, { useSituation } from './carte/Proches.js';
import type { CarteScene, Exposure } from './carte/scene.js';

// Carte interactive : où suis-je, et quels risques près de chez moi
// aujourd'hui ? Carte 3D à gauche (épurée : logement, séismes observés,
// couche du risque choisi), à droite onboarding puis situation par risque.
export type Go = (page: 'carte' | 'prevention', tab?: string) => void;
export default function Carte({ go }: { go: Go }) {
  const home = useHome();
  const situation = useSituation();
  const [manual, setManual] = useState(false);
  const [selected, setSelected] = useState<RiskId | null>(null);
  const [engine, setEngine] = useState<CarteScene | null>(null);
  const [exposure, setExposure] = useState<Exposure | null>(null);
  useEffect(() => {
    setExposure(home && engine ? engine.exposure(home.lat, home.lon) : null);
  }, [home, engine]);
  useEffect(() => setManual(false), [home]);
  const seismes = situation.data?.seismes;
  const events = seismes?.ok ? seismes.data.events : null;
  const recent = useMemo(
    () =>
      events?.filter(
        (e) => Date.now() - Date.parse(e.time) < 30 * 86_400_000,
      ) ?? null,
    [events],
  );
  const showQuakes = !selected || selected === 'seisme';
  const risk = risks.find((r) => r.id === selected);
  const pins: Pin[] = [
    ...(risk?.markers ?? []).map((m) => ({ ...m, icon: risk!.icon })),
    ...(home
      ? [
          {
            id: 'home',
            lat: home.lat,
            lon: home.lon,
            label: 'Mon logement',
            icon: House,
            kind: 'home' as const,
          },
        ]
      : []),
  ];
  return (
    <div className="page carte">
      <header className="page-header">
        <h1 id="page-title" tabIndex={-1}>
          Carte interactive
        </h1>
        <p className="lead">
          Votre position, les risques autour de vous et ce que publient
          aujourd’hui les sources officielles et scientifiques.
        </p>
      </header>
      <section className="card carte-card" aria-label="Carte de la Martinique">
        <div className="carte-body">
          <MapView
            risk={selected}
            pins={pins}
            quakes={showQuakes ? events : null}
            pulses={showQuakes ? recent : null}
            onEngine={setEngine}
            fallback={
              <p>
                La 3D (WebGL) n’est pas disponible sur cet appareil. Les
                informations restent à droite.
              </p>
            }
            top={
              risk ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="carte-back"
                  onClick={() => setSelected(null)}
                >
                  <ArrowLeft size={14} aria-hidden="true" /> Vue d’ensemble
                </Button>
              ) : undefined
            }
            bottom={
              <>
                {risk && (
                  <div
                    className="carte-legend"
                    role="group"
                    aria-label={`Légende : ${risk.label}`}
                  >
                    <strong>
                      <risk.icon size={14} aria-hidden="true" /> {risk.label} :
                      zones calculées
                    </strong>
                    <ul>
                      {risk.legend.map((t, i) => (
                        <li key={t}>
                          <i data-level={i + 1} /> <b>{levelNames[i]}</b> {t}
                        </li>
                      ))}
                    </ul>
                    <p>Calcul sur le relief réel, pas un zonage officiel.</p>
                    <p className="carte-illus">
                      Animation : illustration du phénomène, pas la situation
                      actuelle.
                    </p>
                  </div>
                )}
                {showQuakes && events && (
                  <div
                    className="carte-legend"
                    role="group"
                    aria-label="Légende : séismes observés"
                  >
                    <strong>Séismes observés (USGS)</strong>
                    <ul>
                      <li>
                        <i data-level={3} /> foyer &lt; 30 km
                      </li>
                      <li>
                        <i data-level={2} /> 30 à 100 km
                      </li>
                      <li>
                        <i data-level={1} /> &gt; 100 km
                      </li>
                    </ul>
                  </div>
                )}
                <div className="carte-note">
                  <details>
                    <summary>Sources</summary>
                    <ul>
                      {dataSources.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                      <li>
                        Cyclones : NHC/NOAA. Tsunamis : NOAA (PTWC, NTWC).
                      </li>
                    </ul>
                  </details>
                </div>
              </>
            }
          />
          <aside className="carte-panel" aria-label="Ma situation">
            <div className="carte-panel-body">
              {home ? (
                <section
                  className="carte-block here"
                  aria-label="Vous êtes ici"
                >
                  <h3>Vous êtes ici</h3>
                  <Logement home={home} />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => engine?.focus(home.lat, home.lon)}
                  >
                    <MapPin size={14} aria-hidden="true" /> Recentrer sur mon
                    logement
                  </Button>
                </section>
              ) : manual ? (
                <section
                  className="carte-block"
                  aria-label="Saisir une adresse"
                >
                  <h3>Saisir une adresse</h3>
                  <Logement
                    home={null}
                    startEditing
                    onCancel={() => setManual(false)}
                  />
                </section>
              ) : (
                <Locate onManual={() => setManual(true)} />
              )}
              <Proches
                home={home}
                exposure={exposure}
                situation={situation}
                selected={selected}
                onSelect={setSelected}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => go('prevention', 'comprendre')}
              >
                Comprendre les alertes{' '}
                <ArrowRight size={14} aria-hidden="true" />
              </Button>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
