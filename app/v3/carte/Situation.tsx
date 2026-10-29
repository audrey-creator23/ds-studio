import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { request } from '../../client/api.js';

// Données observées et datées (séismes USGS, risques par commune) et
// leurs états de chargement ; aucune probabilité ni niveau déduit.
export type Seismes = {
  source: string;
  url: string;
  fetchedAt: string;
  stale: boolean;
  events: {
    id: string;
    time: string;
    mag: number;
    depth: number;
    place: string;
    url: string;
    lat: number;
    lon: number;
  }[];
};
export type Commune = {
  source: string;
  fetchedAt: string;
  stale: boolean;
  commune: string | null;
  risques: string[];
  zoneSismique: string | null;
  catnat: { date: string; risque: string }[];
};
export type Load<T> =
  | { state: 'loading' }
  | { state: 'ok'; data: T }
  | { state: 'error'; message: string };

export function useLoad<T>(url: string | null) {
  const [v, setV] = useState<Load<T>>({ state: 'loading' });
  useEffect(() => {
    if (!url) return;
    let alive = true;
    setV({ state: 'loading' });
    request<T>(url).then(
      (data) => alive && setV({ state: 'ok', data }),
      (e) =>
        alive &&
        setV({
          state: 'error',
          message: navigator.onLine
            ? (e as Error).message
            : 'Hors ligne : données indisponibles.',
        }),
    );
    return () => {
      alive = false;
    };
  }, [url]);
  return v;
}

const when = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
export function Stamp({
  at,
  stale,
  source,
}: {
  at: string;
  stale: boolean;
  source: string;
}) {
  return (
    <small className="carte-stamp">
      {source} · mis à jour {when(at)}
      {stale && ' (dernières données en cache, source injoignable)'}
    </small>
  );
}

// Observation : séismes des 30 derniers jours vs moyenne mensuelle des
// 12 mois précédents. « En hausse » = constat chiffré, jamais une alerte.
export function quakeTrend(events: Seismes['events'], now = Date.now()) {
  const day = 86_400_000;
  const last30 = events.filter(
    (e) => now - Date.parse(e.time) < 30 * day,
  ).length;
  const year = events.filter((e) => {
    const age = now - Date.parse(e.time);
    return age >= 30 * day && age < 395 * day;
  }).length;
  const monthly = year / 12;
  return { last30, monthly, rising: last30 >= 3 && last30 > 2 * monthly };
}

export function SeismeCard({ load }: { load: Load<Seismes> }) {
  if (load.state === 'loading')
    return <p className="muted small">Chargement des observations…</p>;
  if (load.state === 'error')
    return <p className="carte-na">Données indisponibles · {load.message}</p>;
  const { events } = load.data;
  const last = events[0];
  const trend = quakeTrend(events);
  const now = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, k) => now - 9 + k);
  const perYear = years.map(
    (y) => events.filter((e) => new Date(e.time).getFullYear() === y).length,
  );
  const max = Math.max(1, ...perYear);
  return (
    <>
      {last ? (
        <p>
          Dernier séisme : <b>M {last.mag.toFixed(1)}</b>,{' '}
          {Math.round(last.depth)} km de profondeur, le {when(last.time)} —{' '}
          {last.place}.
        </p>
      ) : (
        <p>Aucun séisme enregistré sur la période.</p>
      )}
      <p>
        30 derniers jours : <b>{trend.last30}</b> séisme(s) · moyenne mensuelle
        sur un an : {trend.monthly.toFixed(1)}.
      </p>
      {trend.rising && (
        <p className="carte-trend" role="status">
          <TrendingUp size={14} aria-hidden="true" /> Activité observée en
          hausse (constat, pas un niveau d’alerte).
        </p>
      )}
      <figure className="carte-bars" aria-label="Séismes par année, 10 ans">
        {perYear.map((n, k) => (
          <div key={years[k]} title={`${years[k]} : ${n} séisme(s)`}>
            <i style={{ height: `${(n / max) * 100}%` }} />
            <small>{String(years[k]).slice(2)}</small>
          </div>
        ))}
        <figcaption className="sr-only">
          {years.map((y, k) => `${y} : ${perYear[k]}`).join(', ')}
        </figcaption>
      </figure>
      <Stamp at={load.data.fetchedAt} stale={load.data.stale} source="USGS" />
    </>
  );
}
