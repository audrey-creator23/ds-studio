import { useEffect, useState } from 'react';
import { request } from '../client/api.js';
import type { UserData } from '../shared/steps.js';

// Données v3 (statuts d'étapes, pistes, notes) enregistrées par le serveur.
// Un seul état partagé entre les pages. Les écritures partent de l'état le
// plus récent (mise à jour par fonction), s'affichent tout de suite, et
// seule la réponse de la dernière écriture est publiée : des changements
// rapides ne s'écrasent jamais.
let current: UserData | undefined;
let sequence = 0;
let loading: Promise<void> | undefined;
const listeners = new Set<(d: UserData) => void>();
const publish = (d: UserData) => {
  current = d;
  listeners.forEach((l) => l(d));
};

export function useUserData() {
  const [data, setData] = useState(current);
  const [error, setError] = useState('');
  useEffect(() => {
    listeners.add(setData);
    if (!current)
      (loading ??= request<UserData>('v3/data').then(publish)).catch(
        (e: Error) => {
          loading = undefined;
          setError(e.message);
        },
      );
    return () => {
      listeners.delete(setData);
    };
  }, []);
  async function save<K extends keyof UserData>(
    key: K,
    value: UserData[K] | ((prev: UserData[K]) => UserData[K]),
  ) {
    if (!current) throw new Error('Données de suivi non chargées.');
    setError('');
    const next = typeof value === 'function' ? value(current[key]) : value;
    publish({ ...current, [key]: next });
    const mine = ++sequence;
    try {
      const saved = await request<UserData>('v3/data', { key, value: next });
      if (mine === sequence) publish(saved);
    } catch (e) {
      setError((e as Error).message);
      if (mine === sequence)
        await request<UserData>('v3/data').then(publish, () => undefined);
      throw e;
    }
  }
  return { data, error, save };
}
