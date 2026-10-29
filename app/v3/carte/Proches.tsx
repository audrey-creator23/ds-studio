import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ExternalLink, RefreshCw } from 'lucide-react';
import { request } from '../../client/api.js';
import { Button } from '../ui.js';
import { risks, type RiskId } from './risks.js';
import type { Exposure } from './scene.js';
import type { Home } from './Logement.js';
import { SeismeCard, type Seismes } from './Situation.js';

// Les risques près de chez vous : pour chaque risque, trois informations
// distinctes et jamais mélangées : vigilance officielle (gris « Non
// disponible » faute de flux public), observation datée d'une source
// publique, faits de proximité calculés sur le relief. Aucun niveau n'est
// déduit d'une observation ; l'absence de donnée n'est jamais « sûre ».
type Part<T> = { ok: true; data: T } | { ok: false; error: string };
type Stamp = { fetchedAt: string; stale: boolean; source: string; url: string };
export type SituationData = {
  checkedAt: string;
  // Vigilance officielle (connecteur Météo-France) : non disponible tant
  // que le flux autorisé n'est pas connecté.
  vigilance?: { ok: false; error: string; configured: boolean };
  seismes: Part<Seismes>;
  cyclones: Part<
    Stamp & {
      storms: {
        name: string;
        classification: string;
        windKt: number;
        distanceKm: number;
        updated: string;
        url: string;
      }[];
    }
  >;
  tsunami: Part<
    Stamp & {
      messages: {
        center: string;
        title: string;
        category: string;
        updated: string;
        url: string;
      }[];
    }
  >;
};

const HOUR = 3_600_000;
const tz = 'America/Martinique';
export const at = (iso: string, withDay = true) =>
  new Date(iso).toLocaleString('fr-FR', {
    timeZone: tz,
    ...(withDay ? { day: 'numeric', month: 'short', year: 'numeric' } : {}),
    hour: '2-digit',
    minute: '2-digit',
  });

// Vérification automatique toutes les 60 min (et au retour en ligne),
// actualisation manuelle ; une seule requête à la fois ; dernières
// données gardées si la source ou le réseau échoue.
export function useSituation() {
  const [data, setData] = useState<SituationData>();
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [error, setError] = useState('');
  const [next, setNext] = useState(Date.now() + HOUR);
  const busy = useRef(false);
  const load = useCallback(async (force = false) => {
    if (busy.current) return;
    busy.current = true;
    setState('loading');
    try {
      if (!navigator.onLine) throw new Error('Hors ligne');
      setData(
        await request<SituationData>(
          `carte/situation${force ? '?force=1' : ''}`,
        ),
      );
      setState('ok');
      setError('');
    } catch (e) {
      setState('error');
      setError(navigator.onLine ? (e as Error).message : 'Hors ligne');
    } finally {
      busy.current = false;
      setNext(Date.now() + HOUR);
    }
  }, []);
  useEffect(() => {
    void load();
    const online = () => void load();
    addEventListener('online', online);
    return () => removeEventListener('online', online);
  }, [load]);
  useEffect(() => {
    const t = setTimeout(() => void load(), Math.max(0, next - Date.now()));
    return () => clearTimeout(t);
  }, [next, load]);
  return { data, state, error, next, refresh: () => load(true) };
}

// Heure de Martinique en direct et décompte avant la prochaine vérification.
export function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

const km = (
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
) => {
  const r = Math.PI / 180;
  const h =
    Math.sin(((b.lat - a.lat) * r) / 2) ** 2 +
    Math.cos(a.lat * r) *
      Math.cos(b.lat * r) *
      Math.sin(((b.lon - a.lon) * r) / 2) ** 2;
  return Math.round(12742 * Math.asin(Math.sqrt(h)));
};
type Row = {
  status: string;
  date: string;
  zone: string;
  near: string | null;
  observations: { text: string; url?: string }[];
  sources: { label: string; url: string }[];
};

function rowFor(
  id: RiskId,
  s: SituationData | undefined,
  home: Home | null,
  e: Exposure | null,
): Row {
  const r = risks.find((x) => x.id === id)!;
  const official = { label: r.official.org, url: r.official.url };
  const checked = (p: { fetchedAt: string; stale: boolean }) =>
    `vérifié le ${at(p.fetchedAt)}${p.stale ? ' (source injoignable, dernière réponse)' : ''}`;
  const off = (why: string) => ({ status: why, date: '—' });
  if (id === 'seisme') {
    const p = s?.seismes;
    const last = p?.ok ? p.data.events[0] : undefined;
    return {
      ...(p?.ok
        ? last
          ? {
              status: `Dernier séisme observé : M ${last.mag.toFixed(1)}, ${Math.round(last.depth)} km de profondeur`,
              date: `publié le ${at(last.time)}`,
            }
          : {
              status: 'Aucun séisme enregistré sur 10 ans',
              date: checked(p.data),
            }
        : off(p ? `Données indisponibles (${p.error})` : 'Chargement…')),
      zone: 'Arc antillais, toute l’île (zone sismique 5)',
      near:
        home && last
          ? `Dernier épicentre à ${km(home, last)} km de chez vous`
          : null,
      observations: p?.ok
        ? p.data.events.slice(0, 5).map((ev) => ({
            text: `${at(ev.time)} · M ${ev.mag.toFixed(1)} · ${Math.round(ev.depth)} km · ${ev.place}`,
            url: ev.url,
          }))
        : [],
      sources: [
        {
          label: 'USGS (catalogue des séismes)',
          url: 'https://earthquake.usgs.gov/earthquakes/map/',
        },
        official,
      ],
    };
  }
  if (id === 'cyclone') {
    const p = s?.cyclones;
    const storms = p?.ok
      ? [...p.data.storms].sort((a, b) => a.distanceKm - b.distanceKm)
      : [];
    return {
      ...(p?.ok
        ? storms[0]
          ? {
              status: `${storms.length} système(s) actif(s) dans l’Atlantique ; le plus proche à ${storms[0].distanceKm} km`,
              date: `bulletin du ${at(storms[0].updated)}`,
            }
          : {
              status: 'Aucun système tropical actif dans l’Atlantique (NHC)',
              date: checked(p.data),
            }
        : off(p ? `Données indisponibles (${p.error})` : 'Chargement…')),
      zone: 'Martinique entière',
      near: null,
      observations: storms.map((t) => ({
        text: `${t.classification} ${t.name} · vents ${t.windKt} nœuds · à ${t.distanceKm} km · ${at(t.updated)}`,
        url: t.url,
      })),
      sources: [
        {
          label: 'NHC / NOAA (centre régional OMM)',
          url: 'https://www.nhc.noaa.gov/',
        },
        official,
      ],
    };
  }
  if (id === 'tsunami') {
    const p = s?.tsunami;
    const m = p?.ok ? p.data.messages[0] : undefined;
    return {
      ...(p?.ok
        ? m
          ? {
              status: `Dernier message ${m.center} pour la Caraïbe : ${m.category || m.title}`,
              date: `publié le ${at(m.updated)}`,
            }
          : {
              status:
                'Aucun message récent des centres d’alerte NOAA pour la Caraïbe',
              date: checked(p.data),
            }
        : off(p ? `Données indisponibles (${p.error})` : 'Chargement…')),
      zone: 'Littoral de la Martinique',
      near: e?.inMap
        ? `Votre logement : ${e.alt} m d’altitude, ${e.coastKm ?? '—'} km de la mer`
        : null,
      observations: p?.ok
        ? p.data.messages.slice(0, 3).map((x) => ({
            text: `${at(x.updated)} · ${x.center} · ${x.title}`,
            url: x.url,
          }))
        : [],
      sources: [
        {
          label: 'NOAA tsunami.gov (PTWC, NTWC)',
          url: 'https://www.tsunami.gov/',
        },
        official,
      ],
    };
  }
  const near = !e?.inMap
    ? null
    : id === 'volcan'
      ? `Sommet de la montagne Pelée à ${e.peleeKm} km`
      : id === 'pluies'
        ? `Cours d’eau principal à ${e.riverKm ?? '—'} km`
        : id === 'sargasses'
          ? `Mer la plus proche à ${e.coastKm ?? '—'} km`
          : null;
  return {
    ...off(
      'Aucune donnée publique exploitable : consultez la source officielle',
    ),
    zone: {
      volcan: 'Nord de l’île, montagne Pelée',
      pluies: 'Martinique entière',
      sargasses: 'Côtes, surtout atlantique',
      brume: 'Martinique entière',
    }[id as 'volcan'],
    near,
    observations: [],
    sources: [official],
  };
}

// Repère de couleur propre à chaque risque (identification du tag, pas un
// niveau de vigilance).
export const riskColor: Record<RiskId, string> = {
  seisme: '#F55536',
  volcan: '#FF773D',
  tsunami: '#F19143',
  cyclone: '#FFB238',
  pluies: '#FABC3C',
  sargasses: '#9a7b2f',
  brume: '#c9a57a',
};

// Niveau de vigilance actuel (global) puis tags des 7 risques ; le risque
// choisi s'anime sur la carte et sa fiche se déplie (« En savoir plus »).
// Aucun niveau global ni par risque n'est publié en données ouvertes :
// « Vigilance non disponible », jamais assimilé à un niveau vert.
export default function Proches({
  home,
  exposure,
  situation,
  selected,
  onSelect,
}: {
  home: Home | null;
  exposure: Exposure | null;
  situation: ReturnType<typeof useSituation>;
  selected: RiskId | null;
  onSelect: (id: RiskId | null) => void;
}) {
  const now = useNow();
  const [more, setMore] = useState(false);
  useEffect(() => setMore(false), [selected]);
  const { data, state, error, next, refresh } = situation;
  const left = Math.max(0, next - now);
  const mm = String(Math.floor(left / 60_000)).padStart(2, '0');
  const ss = String(Math.floor((left % 60_000) / 1000)).padStart(2, '0');
  const r = risks.find((x) => x.id === selected);
  const row = r ? rowFor(r.id, data, home, exposure) : null;
  return (
    <section
      className="carte-block proches"
      aria-label="Niveau de vigilance actuel"
    >
      <div className="proches-head">
        <h3 className="vig-title">Niveau de vigilance actuel</h3>
        <Button
          variant="outline"
          size="icon"
          title="Actualiser les données"
          aria-label="Actualiser les données"
          aria-busy={state === 'loading'}
          disabled={state === 'loading'}
          onClick={refresh}
        >
          <RefreshCw size={16} aria-hidden="true" />
        </Button>
      </div>
      <p className="vig-global" data-vigilance="na">
        <b>Vigilance non disponible</b>
        <span>
          Le flux officiel Météo-France (outre-mer) n’est pas connecté : son
          accès en direct exige une clé du portail API Météo-France. Ce n’est
          pas un niveau vert. Niveau en vigueur pour{' '}
          {home ? 'votre zone' : 'la Martinique'} :{' '}
          <a
            className="carte-link"
            href="https://meteofrance.mq/fr/vigilance"
            target="_blank"
            rel="noreferrer"
          >
            vigilance Météo-France <ExternalLink size={12} aria-hidden="true" />
            <span className="sr-only"> (nouvel onglet)</span>
          </a>
        </span>
      </p>
      <p className="proches-clock">
        <time dateTime={new Date(now).toISOString()}>
          {new Date(now).toLocaleString('fr-FR', {
            timeZone: tz,
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </time>{' '}
        (heure de Martinique)
      </p>
      <p className="carte-stamp" role="status">
        {state === 'loading'
          ? 'Vérification des sources…'
          : state === 'error'
            ? `Échec de la vérification (${error})${data ? ` : données du ${at(data.checkedAt)}` : ''}`
            : `Dernière vérification ${data ? at(data.checkedAt) : '—'}`}
        {' · '}prochaine dans {mm}:{ss}
      </p>
      <div
        className="vig-tags"
        role="group"
        aria-label="Risques : afficher sur la carte"
      >
        {risks.map((x) => (
          <button
            key={x.id}
            type="button"
            className="vig-tag"
            aria-pressed={selected === x.id}
            aria-label={`${x.label} : vigilance non disponible`}
            title={`${x.label} : vigilance non disponible`}
            style={{ '--risk': riskColor[x.id] } as React.CSSProperties}
            onClick={() => onSelect(selected === x.id ? null : x.id)}
          >
            <span className="rk-icon" data-risk={x.id} aria-hidden="true">
              <x.icon size={15} />
            </span>
            {x.label}
            <i data-vigilance="na" aria-hidden="true" />
          </button>
        ))}
      </div>
      {r && row && (
        <div
          className="vig-selected"
          style={{ '--risk': riskColor[r.id] } as React.CSSProperties}
        >
          <p>
            <b>{r.label}</b> · {row.status}
          </p>
          <small className="carte-stamp">
            {row.zone} · {row.date}
          </small>
          {home && row.near && (
            <small className="proches-near">{row.near}</small>
          )}
          <button
            type="button"
            className="proches-toggle"
            aria-expanded={more}
            aria-controls={`detail-${r.id}`}
            onClick={() => setMore(!more)}
          >
            {more ? 'Masquer' : 'En savoir plus'}{' '}
            <ChevronDown size={14} aria-hidden="true" />
          </button>
          {more && (
            <div id={`detail-${r.id}`} className="proches-detail">
              <dl>
                <div>
                  <dt>Vigilance officielle</dt>
                  <dd>
                    Non disponible : aucune vigilance publiée en données
                    ouvertes pour ce risque. {r.official.note}
                  </dd>
                </div>
                <div>
                  <dt>Zone</dt>
                  <dd>{row.zone}</dd>
                </div>
                {home && (
                  <div>
                    <dt>Proximité de votre logement</dt>
                    <dd>
                      {row.near ??
                        'Pas de calcul de proximité pertinent pour ce risque.'}
                    </dd>
                  </div>
                )}
                <div>
                  <dt>Observations récentes</dt>
                  <dd>
                    {row.observations.length ? (
                      <ul className="carte-list">
                        {row.observations.map((o) => (
                          <li key={o.text}>
                            {o.url ? (
                              <a
                                className="carte-link"
                                href={o.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {o.text}
                              </a>
                            ) : (
                              o.text
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      'Aucune observation publique disponible.'
                    )}
                  </dd>
                </div>
                {r.id === 'seisme' && data?.seismes.ok && (
                  <div>
                    <dt>Évolution datée (10 ans)</dt>
                    <dd>
                      <SeismeCard
                        load={{ state: 'ok', data: data.seismes.data }}
                      />
                    </dd>
                  </div>
                )}
                <div>
                  <dt>Conséquences</dt>
                  <dd>{r.consequences}</dd>
                </div>
                <div>
                  <dt>Consignes</dt>
                  <dd>
                    <ul className="carte-list">
                      {r.pendant.map((g) => (
                        <li key={g}>{g}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
                <div>
                  <dt>Sources et horodatage</dt>
                  <dd>
                    {row.sources.map((src) => (
                      <a
                        key={src.url + src.label}
                        className="carte-link"
                        href={src.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {src.label}{' '}
                        <ExternalLink size={12} aria-hidden="true" />
                        <span className="sr-only"> (nouvel onglet)</span>
                      </a>
                    ))}
                    <small className="carte-stamp">{row.date}</small>
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
