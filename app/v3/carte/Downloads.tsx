import { useEffect, useState } from 'react';
import { Download, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '../ui.js';
import demUrl from './martinique-dem.png';
import { authorities, contacts, kitBase, kitNeeds, risks } from './risks.js';

// Ressources d'urgence hors ligne : contenus réels choisis par
// l'utilisatrice, téléchargés dans le stockage du navigateur (Cache
// Storage), avec taille, progression, mise à jour et suppression ; total
// plafonné à 1 Go. Le navigateur peut effacer ce stockage : la persistance
// est demandée, jamais garantie. Sans source officielle ouverte, la
// ressource est marquée non disponible.
const CACHE = 'pfe-ressources-v1';
const META = 'ds-v3-ressources';
const LIMIT = 1024 ** 3;
type Item = {
  id: string;
  label: string;
  detail: string;
  url?: string;
  data?: () => unknown;
  unavailable?: string;
};
export const items: Item[] = [
  {
    id: 'relief',
    label: 'Carte de la Martinique (relief et fonds marins)',
    detail: 'MNT réel utilisé par la carte 3D.',
    url: demUrl,
  },
  {
    id: 'consignes',
    label: 'Consignes par risque',
    detail: 'Avant, pendant, après, pour les 7 risques, avec leurs sources.',
    data: () =>
      risks.map((r) => ({
        risque: r.label,
        avant: r.avant,
        pendant: r.pendant,
        apres: r.apres,
        source: r.official.org,
      })),
  },
  {
    id: 'contacts',
    label: 'Contacts d’urgence et autorités',
    detail: 'Numéros d’urgence et sites officiels.',
    data: () => ({ contacts, autorites: authorities }),
  },
  {
    id: 'trousse',
    label: 'Composition de la trousse d’urgence',
    detail: 'Socle commun 72 h, besoins particuliers, compléments par risque.',
    data: () => ({
      socle: kitBase,
      besoins: kitNeeds,
      parRisque: risks.map((r) => ({ risque: r.label, kit: r.kit })),
    }),
  },
  {
    id: 'rassemblement',
    label: 'Points de rassemblement, abris et lieux sûrs',
    detail: '',
    unavailable:
      'Non publiés en données ouvertes : consultez le DICRIM de votre commune.',
  },
  {
    id: 'radio',
    label: 'Radio et fréquences',
    detail: '',
    unavailable:
      'Fréquences non vérifiées ici : à confirmer auprès de la préfecture.',
  },
];
type Meta = Record<string, { size: number; at: string }>;
const readMeta = (): Meta => {
  try {
    return JSON.parse(localStorage.getItem(META) ?? '{}');
  } catch {
    return {};
  }
};
const fmt = (n: number) =>
  n < 1024
    ? `${n} o`
    : n < 1024 ** 2
      ? `${(n / 1024).toFixed(1)} Ko`
      : `${(n / 1024 ** 2).toFixed(1)} Mo`;

// Contenu téléchargé, lisible sans réseau.
export async function readOffline(id: string) {
  if (!('caches' in window)) return null;
  const r = await (await caches.open(CACHE)).match(`/pfe-offline/${id}`);
  return r
    ? id === 'relief'
      ? 'Carte disponible hors ligne.'
      : await r.json()
    : null;
}

export default function Downloads() {
  const [meta, setMeta] = useState<Meta>(readMeta);
  const [pick, setPick] = useState<string[]>([
    'consignes',
    'contacts',
    'trousse',
    'relief',
  ]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState('');
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const supported = typeof window !== 'undefined' && 'caches' in window;
  useEffect(() => {
    try {
      localStorage.setItem(META, JSON.stringify(meta));
    } catch {
      // Préférence facultative.
    }
  }, [meta]);
  useEffect(() => {
    void navigator.storage?.persisted?.().then(setPersisted);
  }, []);
  const used = Object.values(meta).reduce((n, m) => n + m.size, 0);

  async function get(item: Item) {
    if (item.data)
      return new Blob([JSON.stringify(item.data())], {
        type: 'application/json',
      });
    const r = await fetch(item.url!);
    if (!r.ok || !r.body) throw new Error(`HTTP ${r.status}`);
    const total = Number(r.headers.get('content-length')) || 0;
    const reader = r.body.getReader();
    const parts: BlobPart[] = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value);
      got += value.length;
      if (total) setProgress((p) => ({ ...p, [item.id]: got / total }));
    }
    return new Blob(parts, {
      type: r.headers.get('content-type') ?? 'application/octet-stream',
    });
  }
  async function download(ids: string[]) {
    setMsg('');
    if (!navigator.onLine)
      return setMsg('Hors ligne : téléchargement impossible.');
    // Persistance demandée au navigateur (il peut refuser).
    if (navigator.storage?.persist)
      setPersisted(await navigator.storage.persist());
    const cache = await caches.open(CACHE);
    // Total courant (les ressources remplacées ne comptent qu'une fois).
    let total = used - ids.reduce((n, id) => n + (meta[id]?.size ?? 0), 0);
    for (const id of ids) {
      const item = items.find((i) => i.id === id)!;
      try {
        setProgress((p) => ({ ...p, [id]: 0 }));
        const blob = await get(item);
        const estimate = await navigator.storage?.estimate?.();
        const free =
          estimate?.quota != null
            ? estimate.quota - (estimate.usage ?? 0)
            : Infinity;
        if (total + blob.size > LIMIT)
          throw new Error('limite de 1 Go atteinte');
        if (blob.size > free)
          throw new Error('espace du navigateur insuffisant');
        await cache.put(
          `/pfe-offline/${id}`,
          new Response(blob, { headers: { 'Content-Type': blob.type } }),
        );
        total += blob.size;
        setMeta((m) => ({
          ...m,
          [id]: { size: blob.size, at: new Date().toISOString() },
        }));
      } catch (e) {
        setMsg(`${item.label} : échec (${(e as Error).message}).`);
      } finally {
        setProgress((p) => {
          const { [id]: _, ...rest } = p;
          return rest;
        });
      }
    }
  }
  async function remove(id: string) {
    await (await caches.open(CACHE)).delete(`/pfe-offline/${id}`);
    setMeta(({ [id]: _, ...rest }) => rest);
  }
  if (!supported)
    return (
      <p className="carte-na">
        Stockage hors ligne indisponible dans ce navigateur.
      </p>
    );
  return (
    <div className="dl">
      <ul className="dl-list">
        {items.map((i) => {
          const m = meta[i.id];
          const p = progress[i.id];
          return (
            <li key={i.id} data-unavailable={i.unavailable ? '' : undefined}>
              <label>
                <input
                  type="checkbox"
                  disabled={!!i.unavailable}
                  checked={!i.unavailable && pick.includes(i.id)}
                  onChange={() =>
                    setPick((x) =>
                      x.includes(i.id)
                        ? x.filter((y) => y !== i.id)
                        : [...x, i.id],
                    )
                  }
                />
                <span>
                  <b>{i.label}</b>
                  <small className="carte-stamp">
                    {i.unavailable ??
                      (m
                        ? `Téléchargé : ${fmt(m.size)}, le ${new Date(m.at).toLocaleDateString('fr-FR')}`
                        : i.detail)}
                  </small>
                </span>
              </label>
              {p !== undefined && (
                <progress
                  max={1}
                  value={p}
                  aria-label={`Progression : ${i.label}`}
                />
              )}
              {m && (
                <span className="dl-actions">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Mettre à jour"
                    aria-label={`Mettre à jour : ${i.label}`}
                    onClick={() => void download([i.id])}
                  >
                    <RefreshCw size={14} aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Supprimer"
                    aria-label={`Supprimer : ${i.label}`}
                    onClick={() => void remove(i.id)}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </Button>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <div className="row">
        <small className="carte-stamp">
          Utilisé : {fmt(used)} / 1 Go ·{' '}
          {persisted
            ? 'stockage persistant accordé'
            : 'stockage non garanti (le navigateur peut l’effacer)'}
        </small>
        <Button
          size="sm"
          disabled={
            !pick.some((id) => !items.find((i) => i.id === id)?.unavailable)
          }
          onClick={() =>
            void download(
              pick.filter((id) => !items.find((i) => i.id === id)?.unavailable),
            )
          }
        >
          <Download size={14} aria-hidden="true" /> Télécharger la sélection
        </Button>
      </div>
      {msg && (
        <p className="alert-text" role="alert">
          {msg}
        </p>
      )}
    </div>
  );
}
