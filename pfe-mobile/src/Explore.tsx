import { useEffect, useRef, useState } from 'react';
import { House } from 'lucide-react';
import { risks, type RiskId } from '../../app/v3/carte/risks.js';
import MapView, { type Pin } from '../../app/v3/carte/MapView.js';
import Logement, { useHome } from '../../app/v3/carte/Logement.js';
import Locate from '../../app/v3/carte/Locate.js';
import Proches, { at, useSituation } from '../../app/v3/carte/Proches.js';
import type { CarteScene } from '../../app/v3/carte/scene.js';

// « Où êtes-vous ? » avant la carte : géolocalisation, adresse, ou
// dernière adresse enregistrée (modifiable, supprimable). Ne revient que
// si aucune adresse n'est validée, ou depuis le menu « Ma position ».
export function Where({ onDone }: { onDone: () => void }) {
  const home = useHome();
  const [start] = useState(home?.savedAt);
  const [manual, setManual] = useState(false);
  useEffect(() => {
    if (home && home.savedAt !== start) onDone();
  }, [home, start, onDone]);
  return (
    <div className="m-scroll">
      {home && (
        <section className="m-last" aria-label="Ma dernière adresse">
          <Logement home={home} />
          <button type="button" className="m-cta m-cta--small" onClick={onDone}>
            <House size={20} aria-hidden="true" /> Utiliser ma dernière adresse
          </button>
        </section>
      )}
      {manual ? (
        <section className="carte-block" aria-label="Saisir une adresse">
          <h2>Saisir une adresse</h2>
          <Logement
            home={null}
            startEditing
            onCancel={() => setManual(false)}
          />
        </section>
      ) : (
        <Locate onManual={() => setManual(true)} />
      )}
    </div>
  );
}

type Sheet = 'peek' | 'half' | 'full';
const order: Sheet[] = ['peek', 'half', 'full'];

// Carte plein écran : burger (cadre) en haut à gauche, vigilance actuelle
// flottante en haut à droite, tiroir en bas (réduit : 7 risques ;
// intermédiaire / déployé : tags, sources, fiche, actualisation).
export default function Explore({ header }: { header: React.ReactNode }) {
  const home = useHome();
  const situation = useSituation();
  const [selected, setSelected] = useState<RiskId | null>(null);
  const [sheet, setSheet] = useState<Sheet>('peek');
  const [engine, setEngine] = useState<CarteScene | null>(null);
  const drag = useRef<number | null>(null);
  useEffect(() => {
    if (home && engine) engine.focus(home.lat, home.lon);
  }, [home, engine]);
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
  const d = situation.data;
  const events = d?.seismes.ok ? d.seismes.data.events : null;
  const move = (step: number) =>
    setSheet((s) => order[Math.min(2, Math.max(0, order.indexOf(s) + step))]);
  return (
    <div className="m-explore" data-sheet={sheet}>
      <MapView
        risk={selected}
        pins={pins}
        quakes={!selected || selected === 'seisme' ? events : null}
        onEngine={setEngine}
        fallback={<p>La 3D n’est pas disponible sur cet appareil.</p>}
      />
      <div className="m-over">
        {header}
        <button
          type="button"
          className="m-vig"
          onClick={() => setSheet('full')}
          aria-label="Vigilance actuelle : non disponible. Voir le détail"
        >
          <small>Vigilance actuelle</small>
          <b>
            <i data-vigilance="na" aria-hidden="true" /> Non disponible
          </b>
          <small>
            {d
              ? `Météo-France · vérifié ${at(d.checkedAt, false)}`
              : 'Météo-France'}
          </small>
        </button>
      </div>
      {risk && (
        <p className="m-illus carte-badge">
          Illustration du phénomène, pas la situation actuelle
        </p>
      )}
      <section className="m-sheet" aria-label="Risques">
        <button
          type="button"
          className="m-handle"
          aria-label={
            sheet === 'full' ? 'Réduire le panneau' : 'Agrandir le panneau'
          }
          aria-expanded={sheet !== 'peek'}
          onPointerDown={(e) => (drag.current = e.clientY)}
          onPointerUp={(e) => {
            const dy = drag.current === null ? 0 : e.clientY - drag.current;
            drag.current = null;
            if (dy < -30) move(1);
            else if (dy > 30) move(-1);
            else
              setSheet((s) =>
                s === 'full' ? 'peek' : order[order.indexOf(s) + 1],
              );
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') move(1);
            else if (e.key === 'ArrowDown') move(-1);
            else return;
            e.preventDefault();
          }}
        >
          <span aria-hidden="true" />
        </button>
        <div className="m-peek" role="group" aria-label="Aperçu des 7 risques">
          {risks.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={selected === r.id}
              title={`${r.label} : vigilance non disponible`}
              aria-label={`${r.label} : vigilance non disponible`}
              onClick={() => {
                setSelected(selected === r.id ? null : r.id);
                if (sheet === 'peek') setSheet('half');
              }}
            >
              <r.icon size={20} aria-hidden="true" />
              <i data-vigilance="na" aria-hidden="true" />
            </button>
          ))}
        </div>
        {sheet !== 'peek' && (
          <div className="m-sheet-body">
            <Proches
              home={home}
              exposure={
                home && engine ? engine.exposure(home.lat, home.lon) : null
              }
              situation={situation}
              selected={selected}
              onSelect={setSelected}
            />
          </div>
        )}
      </section>
    </div>
  );
}
