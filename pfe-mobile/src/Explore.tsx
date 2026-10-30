import { useEffect, useRef, useState } from 'react';
import { House, Pencil, LocateFixed, X } from 'lucide-react';
import { Button } from '../../app/v3/ui.js';
import { risks, type RiskId } from '../../app/v3/carte/risks.js';
import MapView, { FicheView, type Pin } from '../../app/v3/carte/MapView.js';
import {
  placeLook,
  placeName,
  pointPlace,
  savePlace,
  usePlaces,
  type Place,
} from '../../app/v3/carte/Places.js';
import { communeAt } from '../../app/v3/carte/communes.js';
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

// « closed » : tiroir masqué (mobile, le dock ouvre « Risques »).
export type Sheet = 'closed' | 'peek' | 'half' | 'full';
const order: Sheet[] = ['peek', 'half', 'full'];
// Mobile (dock) : le tiroir se ferme ; grand écran : il reste en aperçu.
export const mobile = () =>
  typeof matchMedia === 'function' && matchMedia('(max-width: 899px)').matches;

// Carte plein écran : burger (cadre) en haut à gauche, vigilance actuelle
// flottante en haut à droite, tiroir en bas (réduit : 7 risques ;
// intermédiaire / déployé : tags, sources, fiche, actualisation).
export default function Explore({
  header,
  sheet,
  onSheet,
  placing,
  onPlaced,
  focusOn,
  onEditPlace,
}: {
  header: React.ReactNode;
  sheet: Sheet;
  onSheet: (s: Sheet) => void;
  // Lieu à placer d'un toucher sur la carte (Mes lieux), sinon null.
  placing: Partial<Place> | null;
  onPlaced: () => void;
  focusOn: Place | null;
  onEditPlace: (id: string) => void;
}) {
  const home = useHome();
  const places = usePlaces();
  const situation = useSituation();
  const [selected, setSelected] = useState<RiskId | null>(null);
  const [engine, setEngine] = useState<CarteScene | null>(null);
  const [fiche, setFiche] = useState<Place | null>(null);
  const [placeError, setPlaceError] = useState('');
  const drag = useRef<number | null>(null);
  const setSheet = (f: Sheet | ((s: Sheet) => Sheet)) =>
    onSheet(typeof f === 'function' ? f(sheet) : f);
  useEffect(() => {
    if (home && engine) engine.focus(home.lat, home.lon);
  }, [home, engine]);
  useEffect(() => {
    if (focusOn && engine) engine.focus(focusOn.lat, focusOn.lon);
  }, [focusOn, engine]);
  // Recentrage demandé depuis le menu (mobile, sans boutons flottants).
  useEffect(() => {
    const on = () =>
      home ? engine?.focus(home.lat, home.lon) : engine?.reset();
    addEventListener('pfe-recenter', on);
    return () => removeEventListener('pfe-recenter', on);
  }, [home, engine]);
  const risk = risks.find((r) => r.id === selected);
  const pins: Pin[] = [
    ...(risk?.markers ?? []).map((m) => ({ ...m, icon: risk!.icon })),
    ...places.map((p) => ({
      id: `lieu-${p.id}`,
      lat: p.lat,
      lon: p.lon,
      label: placeName(p),
      ...placeLook(p),
      kind: p.id === 'principal' ? ('home' as const) : ('place' as const),
      onClick: () => setFiche(p),
    })),
  ];
  // Zone de la vigilance affichée : adresse enregistrée, sinon commune,
  // sinon rien. Le périmètre officiel reste le département.
  const zone = home?.label || home?.city || 'Localisation non renseignée';
  const d = situation.data;
  const events = d?.seismes.ok ? d.seismes.data.events : null;
  const move = (step: number) =>
    setSheet((s) =>
      (s === 'closed' || s === 'peek') && step < 0 && mobile()
        ? 'closed'
        : order[Math.min(2, Math.max(0, order.indexOf(s) + step))],
    );
  return (
    <div className="m-explore" data-sheet={sheet}>
      <MapView
        risk={selected}
        pins={pins}
        quakes={!selected || selected === 'seisme' ? events : null}
        onEngine={setEngine}
        onPickPoint={(lat, lon) => {
          if (!placing) return;
          const p = pointPlace(placing, lat, lon, 'Point placé sur la carte');
          if (!p) return setPlaceError('Touchez un point de la Martinique.');
          savePlace(p);
          setPlaceError('');
          onPlaced();
        }}
        fallback={<p>La 3D n’est pas disponible sur cet appareil.</p>}
      />
      <div className="m-over">
        {header}
        <button
          type="button"
          className="m-vig"
          onClick={() => setSheet('full')}
          aria-label={`Vigilance actuelle : non disponible. Zone concernée : ${zone}. Voir le détail`}
        >
          <small>Vigilance actuelle</small>
          <b>
            <i data-vigilance="na" aria-hidden="true" /> Non disponible
          </b>
          <span className="m-vig-zone" title={zone}>
            Zone concernée : {zone}
          </span>
          <small>
            {d
              ? `Météo-France · Martinique · vérifié ${at(d.checkedAt, false)}`
              : 'Météo-France · Martinique'}
          </small>
        </button>
      </div>
      {placing && (
        <div className="m-placing" role="status">
          <span>
            Touchez la carte pour placer « {placeName(placing)} ».
            {placeError && <b> {placeError}</b>}
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Annuler le placement"
            title="Annuler"
            onClick={onPlaced}
          >
            <X size={16} aria-hidden="true" />
          </Button>
        </div>
      )}
      {fiche && (
        <FicheView
          title={placeName(fiche)}
          onClose={() => setFiche(null)}
          rows={[
            ['Adresse', fiche.label],
            ['Commune', communeAt(fiche.lat, fiche.lon)?.nom ?? fiche.city],
            ['Statut', 'Lieu personnel, pas une information officielle'],
            [
              'Actions',
              <span className="d-row" key="a">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => engine?.focus(fiche.lat, fiche.lon)}
                >
                  <LocateFixed size={14} aria-hidden="true" /> Recentrer
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEditPlace(fiche.id)}
                >
                  <Pencil size={14} aria-hidden="true" /> Modifier
                </Button>
              </span>,
            ],
          ]}
        />
      )}
      {risk && (
        <p className="m-illus carte-badge">
          Illustration du phénomène, pas la situation actuelle
        </p>
      )}
      <section
        className="m-sheet"
        aria-label="Risques"
        hidden={sheet === 'closed'}
      >
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
                s === 'full'
                  ? mobile()
                    ? 'closed'
                    : 'peek'
                  : order[order.indexOf(s) + 1],
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
