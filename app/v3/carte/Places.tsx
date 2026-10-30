import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Briefcase,
  Building2,
  Crosshair,
  House,
  MapPin,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  Users,
} from 'lucide-react';
import { Button } from '../ui.js';
import Logement, { readHome, writeHome, type Home } from './Logement.js';
import { communeAt } from './communes.js';
import { MAX_ACCURACY } from './Locate.js';
import { readSaved, writeSaved, useSavedState } from '../localStore.js';

// Mes lieux : logement principal (stockage existant `ds-v3-logement`,
// inchangé : migration sans perte) + autres lieux (`ds-v3-lieux`). Tout
// reste sur l'appareil, aucun partage. Marqueurs personnels, jamais des
// informations officielles.
export const placeTypes: Record<string, { label: string; icon: LucideIcon }> = {
  maison: { label: 'Maison', icon: House },
  appartement: { label: 'Appartement', icon: Building2 },
  travail: { label: 'Travail', icon: Briefcase },
  famille: { label: 'Famille', icon: Users },
  favori: { label: 'Favori', icon: Star },
};
export const placeColors = [
  '#FF773D',
  '#FABC3C',
  '#F19143',
  '#F55536',
  '#3A3A3A',
];
export type Place = Home & { id: string };
export const PRIMARY = 'principal';
const KEY = 'ds-v3-lieux';

function readOthers(): Place[] {
  try {
    const v = readSaved<Place[]>(KEY, []);
    return Array.isArray(v)
      ? v.filter(
          (p) =>
            p?.id &&
            /^972\d{2}$/.test(p.citycode) &&
            Number.isFinite(p.lat) &&
            Number.isFinite(p.lon),
        )
      : [];
  } catch {
    return [];
  }
}
function writeOthers(list: Place[]) {
  writeSaved(KEY, list);
  dispatchEvent(new Event('ds-home'));
}
export function readPlaces(): Place[] {
  const home = readHome();
  return [...(home ? [{ ...home, id: PRIMARY }] : []), ...readOthers()];
}
export function usePlaces() {
  const [list, setList] = useState(readPlaces);
  useEffect(() => {
    const sync = () => setList(readPlaces());
    addEventListener('ds-home', sync);
    addEventListener('storage', sync);
    return () => {
      removeEventListener('ds-home', sync);
      removeEventListener('storage', sync);
    };
  }, []);
  return list;
}
export const placeName = (p: Partial<Home> & { id?: string }) =>
  p.name ||
  (p.id === PRIMARY ? 'Mon logement' : p.id ? 'Lieu' : 'Nouveau lieu');
export const placeLook = (p: Home) => ({
  icon: (placeTypes[p.type ?? ''] ?? placeTypes.maison).icon,
  color: p.color ?? placeColors[0],
});

export function savePlace(p: Place) {
  const { id, ...home } = p;
  if (id === PRIMARY) return writeHome(home);
  const others = readOthers();
  const k = others.findIndex((o) => o.id === id);
  writeOthers(
    k < 0 ? [...others, p] : others.map((o) => (o.id === id ? p : o)),
  );
}
export function removePlace(id: string) {
  if (id === PRIMARY) return writeHome(null);
  writeOthers(readOthers().filter((o) => o.id !== id));
}
// Domicile principal : le lieu choisi prend la place du logement, l'ancien
// logement devient un lieu comme les autres.
export function makePrimary(id: string) {
  const home = readHome();
  const others = readOthers();
  const next = others.find((o) => o.id === id);
  if (!next) return;
  const { id: _, ...h } = next;
  writeOthers([
    ...(home
      ? [
          {
            ...home,
            name: placeName({ ...home, id: PRIMARY }),
            id: crypto.randomUUID(),
          },
        ]
      : []),
    ...others.filter((o) => o.id !== id),
  ]);
  writeHome(h);
}
// Point en Martinique → lieu (commune locale, sans réseau), sinon null.
export function pointPlace(
  draft: Partial<Place>,
  lat: number,
  lon: number,
  how: string,
): Place | null {
  const c = communeAt(lat, lon);
  if (!c) return null;
  return {
    ...draft,
    id: draft.id ?? crypto.randomUUID(),
    label: `${how} · ${c.nom}`,
    city: c.nom,
    citycode: c.code,
    lat,
    lon,
    savedAt: new Date().toISOString(),
  };
}

export default function Places({
  editId,
  onFocus,
  onPickOnMap,
}: {
  // Ouvre directement la fiche d'un lieu (depuis la carte).
  editId?: string;
  onFocus: (p: Place) => void;
  // Placement sur la carte : l'appelant ouvre la carte en mode placement.
  onPickOnMap: (draft: Partial<Place>) => void;
}) {
  const places = usePlaces();
  const [, , storageError] = useSavedState<Place[]>(KEY, []);
  const [, , homeError] = useSavedState<Home | null>('ds-v3-logement', null);
  const [edit, setEdit] = useState<Partial<Place> | null>(
    () => readPlaces().find((p) => p.id === editId) ?? null,
  );
  if (edit)
    return (
      <PlaceForm
        draft={edit}
        onDone={() => setEdit(null)}
        onPickOnMap={onPickOnMap}
      />
    );
  return (
    <div className="places">
      {(storageError || homeError) && (
        <p role="alert" className="alert-text">
          {storageError || homeError}
        </p>
      )}
      {places.length === 0 && (
        <p className="carte-na">Aucun lieu enregistré sur cet appareil.</p>
      )}
      <ul className="places-list" aria-label="Mes lieux">
        {places.map((p) => {
          const { icon: Icon, color } = placeLook(p);
          const name = placeName(p);
          return (
            <li key={p.id} className="places-item">
              <span
                className="places-dot"
                style={{ background: color }}
                aria-hidden="true"
              >
                <Icon size={14} />
              </span>
              <div>
                <b>
                  {name}
                  {p.id === PRIMARY && (
                    <small className="places-badge">Principal</small>
                  )}
                </b>
                <span className="carte-home-addr" title={p.label}>
                  {p.label}
                </span>
                <small className="muted">
                  {communeAt(p.lat, p.lon)?.nom ?? p.city}
                </small>
              </div>
              <span className="places-actions">
                <Button
                  variant="ghost"
                  size="icon"
                  title="Recentrer"
                  aria-label={`Recentrer sur ${name}`}
                  onClick={() => onFocus(p)}
                >
                  <MapPin size={15} aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Modifier"
                  aria-label={`Modifier ${name}`}
                  onClick={() => setEdit(p)}
                >
                  <Pencil size={15} aria-hidden="true" />
                </Button>
                {p.id !== PRIMARY && (
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Définir comme domicile principal"
                    aria-label={`Définir ${name} comme domicile principal`}
                    onClick={() => makePrimary(p.id)}
                  >
                    <Star size={15} aria-hidden="true" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  title="Supprimer"
                  aria-label={`Supprimer ${name}`}
                  onClick={() =>
                    confirm(`Supprimer « ${name} » de cet appareil ?`) &&
                    removePlace(p.id)
                  }
                >
                  <Trash2 size={15} aria-hidden="true" />
                </Button>
              </span>
            </li>
          );
        })}
      </ul>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setEdit({ type: 'maison', color: placeColors[0] })}
      >
        <Plus size={14} aria-hidden="true" /> Ajouter un lieu
      </Button>
      <small className="carte-stamp">
        Lieux gardés uniquement sur cet appareil, jamais partagés. Marqueurs
        personnels : aucune information officielle.
      </small>
    </div>
  );
}

// Fiche d'un lieu : nom, type, couleur ; position par adresse (BAN, avec
// consentement), GPS (consentement, précision ≤ 300 m) ou sur la carte.
function PlaceForm({
  draft,
  onDone,
  onPickOnMap,
}: {
  draft: Partial<Place>;
  onDone: () => void;
  onPickOnMap: (draft: Partial<Place>) => void;
}) {
  const [d, setD] = useState(draft);
  const [mode, setMode] = useState<'address' | 'gps' | null>(null);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const isNew = !draft.id;
  const meta = { name: d.name, type: d.type, color: d.color, id: d.id };
  const gps = () => {
    setError('');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (coords.accuracy > MAX_ACCURACY)
          return setError(
            `Position trop imprécise (± ${Math.round(coords.accuracy)} m).`,
          );
        const p = pointPlace(
          meta,
          coords.latitude,
          coords.longitude,
          'Position GPS',
        );
        if (!p) return setError('Position hors de la Martinique.');
        setD(p);
        setMode(null);
      },
      () => setError('Position refusée ou indisponible.'),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };
  return (
    <form
      className="places-form"
      aria-label={isNew ? 'Ajouter un lieu' : 'Modifier le lieu'}
      onSubmit={(e) => {
        e.preventDefault();
        if (d.lat === undefined) return setError('Choisissez une position.');
        savePlace({ ...(d as Place), id: d.id ?? crypto.randomUUID() });
        onDone();
      }}
    >
      <label className="plan-field">
        <span>Nom</span>
        <input
          className="input input-sm"
          value={d.name ?? ''}
          maxLength={40}
          placeholder={d.id === PRIMARY ? 'Mon logement' : 'Ex. Chez mamie'}
          onChange={(e) => setD({ ...d, name: e.target.value })}
        />
      </label>
      <fieldset className="places-pick">
        <legend className="small">Type</legend>
        {Object.entries(placeTypes).map(([id, t]) => (
          <label key={id} className="chip-check">
            <input
              type="radio"
              name="type"
              checked={(d.type ?? 'maison') === id}
              onChange={() => setD({ ...d, type: id })}
            />
            <t.icon size={14} aria-hidden="true" /> {t.label}
          </label>
        ))}
      </fieldset>
      <fieldset className="places-pick">
        <legend className="small">Couleur</legend>
        {placeColors.map((c) => (
          <label key={c} className="places-swatch" style={{ background: c }}>
            <input
              type="radio"
              name="color"
              aria-label={`Couleur ${c}`}
              checked={(d.color ?? placeColors[0]) === c}
              onChange={() => setD({ ...d, color: c })}
            />
          </label>
        ))}
      </fieldset>
      <fieldset className="places-pick">
        <legend className="small">Position</legend>
        <p className="carte-home-addr">
          {d.label ?? 'Aucune position choisie.'}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-pressed={mode === 'address'}
          onClick={() => setMode('address')}
        >
          <Search size={14} aria-hidden="true" /> Adresse
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-pressed={mode === 'gps'}
          onClick={() => setMode('gps')}
        >
          <Crosshair size={14} aria-hidden="true" /> Ma position
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPickOnMap(meta)}
        >
          <MapPin size={14} aria-hidden="true" /> Sur la carte
        </Button>
      </fieldset>
      {mode === 'address' && (
        <Logement
          home={null}
          startEditing
          onCancel={() => setMode(null)}
          onSelect={(h) => {
            setD({ ...d, ...h });
            setMode(null);
          }}
        />
      )}
      {mode === 'gps' && (
        <div className="carte-home-form">
          <label className="carte-consent">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>
              J’accepte que ma position soit lue une fois pour ce lieu. Elle
              reste sur cet appareil.
            </span>
          </label>
          <Button type="button" size="sm" disabled={!consent} onClick={gps}>
            <Crosshair size={14} aria-hidden="true" /> Lire ma position
          </Button>
        </div>
      )}
      {error && (
        <p className="alert-text" role="alert">
          {error}
        </p>
      )}
      <div className="row">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Annuler
        </Button>
        <Button type="submit" size="sm">
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
