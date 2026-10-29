import { useEffect, useState } from 'react';
import { House, Pencil, Search, Trash2 } from 'lucide-react';
import { Stamp, useLoad, type Commune } from './Situation.js';
import type { Exposure } from './scene.js';
import { request } from '../../client/api.js';
import { Button } from '../ui.js';

// Mon logement : adresse en Martinique localisée par la Base Adresse
// Nationale (service public), avec consentement explicite. L'adresse est
// gardée sur cet appareil seulement (stockage du navigateur), jamais
// envoyée au serveur DS-Studio ni partagée ; modifiable et supprimable.
export type Home = {
  label: string;
  city: string;
  citycode: string;
  lat: number;
  lon: number;
  savedAt: string;
};
type Result = Omit<Home, 'savedAt'> & { score: number; precision: string };
const KEY = 'ds-v3-logement';

export function readHome(): Home | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    return v && /^972\d{2}$/.test(v.citycode) && Number.isFinite(v.lat)
      ? v
      : null;
  } catch {
    return null;
  }
}
export function writeHome(home: Home | null) {
  try {
    if (home) localStorage.setItem(KEY, JSON.stringify(home));
    else localStorage.removeItem(KEY);
  } catch {
    // Stockage indisponible : gardé pour la session seulement.
  }
  dispatchEvent(new Event('ds-home'));
}
// Même logement dans toutes les pages (Carte, Prévention, autres onglets).
export function useHome() {
  const [home, setHome] = useState(readHome);
  useEffect(() => {
    const sync = () => setHome(readHome());
    addEventListener('ds-home', sync);
    addEventListener('storage', sync);
    return () => {
      removeEventListener('ds-home', sync);
      removeEventListener('storage', sync);
    };
  }, []);
  return home;
}

export default function Logement({
  home,
  onChange,
  startEditing = false,
  onCancel,
}: {
  home: Home | null;
  onChange?: (h: Home | null) => void;
  // Ouvre directement la saisie ; `onCancel` referme (onboarding carte).
  startEditing?: boolean;
  onCancel?: () => void;
}) {
  const [editing, setEditing] = useState(startEditing);
  const [consent, setConsent] = useState(false);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<Result[]>();
  // Autocomplétion : recherche après une courte pause de frappe.
  useEffect(() => {
    if (!consent || q.trim().length < 5) return;
    const t = setTimeout(() => void find(), 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, consent]);
  async function search(e: React.FormEvent) {
    e.preventDefault();
    await find();
  }
  async function find() {
    setError('');
    setBusy(true);
    try {
      const r = await request<{ results: Result[] }>('carte/geocode', { q });
      setResults(r.results);
      if (!r.results.length)
        setError('Aucune adresse trouvée en Martinique. Précisez la commune.');
    } catch (err) {
      setError(
        navigator.onLine
          ? (err as Error).message
          : 'Hors ligne : la recherche d’adresse est indisponible.',
      );
    } finally {
      setBusy(false);
    }
  }
  if (home && !editing)
    return (
      <div className="carte-home">
        <House size={16} aria-hidden="true" />
        <div>
          <strong>{home.label}</strong>
          <small className="muted">
            Enregistré sur cet appareil le{' '}
            {new Date(home.savedAt).toLocaleDateString('fr-FR')}
          </small>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Modifier mon logement"
          title="Modifier"
          onClick={() => setEditing(true)}
        >
          <Pencil size={14} aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Supprimer mon logement"
          title="Supprimer"
          onClick={() => {
            if (confirm('Supprimer l’adresse enregistrée sur cet appareil ?')) {
              writeHome(null);
              onChange?.(null);
            }
          }}
        >
          <Trash2 size={14} aria-hidden="true" />
        </Button>
      </div>
    );
  if (!editing && !home)
    return (
      <Button
        variant="outline"
        size="sm"
        className="carte-home-add"
        onClick={() => setEditing(true)}
      >
        <House size={14} aria-hidden="true" /> Configurer mon logement
      </Button>
    );
  return (
    <form
      className="carte-home-form"
      onSubmit={search}
      aria-label="Configurer mon logement"
    >
      <label className="carte-consent">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span>
          J’accepte que l’adresse saisie soit envoyée à la Base Adresse
          Nationale (service public) pour la localiser. Elle sera ensuite gardée
          uniquement sur cet appareil, jamais partagée.
        </span>
      </label>
      <div className="row">
        <input
          className="input input-sm"
          aria-label="Adresse en Martinique"
          placeholder="Ex. 12 rue Victor Hugo, Fort-de-France"
          autoComplete="street-address"
          value={q}
          disabled={!consent}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button
          size="sm"
          type="submit"
          disabled={!consent || busy || q.trim().length < 3}
        >
          <Search size={14} aria-hidden="true" />{' '}
          {busy ? 'Recherche…' : 'Localiser'}
        </Button>
      </div>
      {error && (
        <p className="alert-text" role="alert">
          {error}
        </p>
      )}
      {results && results.length > 0 && (
        <ul className="carte-results" aria-label="Adresses trouvées">
          {results.map((r) => (
            <li key={`${r.lat},${r.lon}`}>
              <button
                type="button"
                onClick={() => {
                  const h: Home = {
                    label: r.label,
                    city: r.city,
                    citycode: r.citycode,
                    lat: r.lat,
                    lon: r.lon,
                    savedAt: new Date().toISOString(),
                  };
                  writeHome(h);
                  onChange?.(h);
                  setEditing(false);
                  setResults(undefined);
                  setQ('');
                }}
              >
                {r.label}
                <small className="muted">
                  {r.precision === 'housenumber'
                    ? 'numéro précis'
                    : r.precision === 'street'
                      ? 'rue'
                      : 'lieu'}{' '}
                  · confiance {Math.round(r.score * 100)} %
                </small>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="row">
        <small className="muted">Source : Base Adresse Nationale.</small>
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => {
            setEditing(false);
            setResults(undefined);
            onCancel?.();
          }}
        >
          Annuler
        </Button>
      </div>
    </form>
  );
}

// Exposition géographique du logement (faits calculés sur le relief) et
// risques recensés pour sa commune (Géorisques), sans niveau inventé.
export function HomeFacts({
  home,
  exposure,
}: {
  home: Home;
  exposure: Exposure | null;
}) {
  const commune = useLoad<Commune>(`carte/commune?insee=${home.citycode}`);
  return (
    <section className="carte-block" aria-label="Mon logement">
      <h3>Mon logement</h3>
      {exposure?.inMap ? (
        <dl className="carte-facts">
          <div>
            <dt>Altitude</dt>
            <dd>{exposure.alt} m</dd>
          </div>
          <div>
            <dt>Mer la plus proche</dt>
            <dd>{exposure.coastKm ?? '—'} km</dd>
          </div>
          <div>
            <dt>Cours d’eau principal</dt>
            <dd>{exposure.riverKm ?? '—'} km</dd>
          </div>
          <div>
            <dt>Sommet de la Pelée</dt>
            <dd>{exposure.peleeKm} km</dd>
          </div>
        </dl>
      ) : (
        <p className="carte-na">Adresse hors de la carte.</p>
      )}
      <small className="carte-stamp">
        Faits calculés sur le relief (MNT ~75 m), indicatifs : pas un niveau de
        risque.
      </small>
      {commune.state === 'loading' && (
        <p className="muted small">Chargement des risques de la commune…</p>
      )}
      {commune.state === 'error' && (
        <p className="carte-na">
          Risques de la commune : données indisponibles · {commune.message}
        </p>
      )}
      {commune.state === 'ok' && (
        <>
          <p>
            <b>{commune.data.commune ?? home.city}</b> — risques recensés :{' '}
            {commune.data.risques.length
              ? commune.data.risques.join(', ')
              : 'données indisponibles'}
            .
          </p>
          {commune.data.zoneSismique && (
            <p>Zone sismique : {commune.data.zoneSismique}.</p>
          )}
          {commune.data.catnat.length > 0 && (
            <details>
              <summary>
                Catastrophes naturelles reconnues ({commune.data.catnat.length})
              </summary>
              <ul className="carte-list">
                {commune.data.catnat.slice(0, 8).map((c, k) => (
                  <li key={k}>
                    {c.date} · {c.risque}
                  </li>
                ))}
              </ul>
            </details>
          )}
          <Stamp
            at={commune.data.fetchedAt}
            stale={commune.data.stale}
            source="Géorisques"
          />
        </>
      )}
      <p className="carte-na">
        Points de rassemblement, refuges et itinéraires officiels : non publiés
        en données ouvertes. Consultez le DICRIM de votre mairie.
      </p>
    </section>
  );
}
