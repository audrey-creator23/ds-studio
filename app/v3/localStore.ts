import { useEffect, useState } from 'react';

// Écriture explicite seulement. Si le navigateur refuse le stockage, la
// valeur reste disponible pendant la session et l'interface le signale.
const session = new Map<string, unknown>();
const errors = new Map<string, string>();
const event = 'ds-local-data';
export function readSaved<T>(key: string, fallback: T): T {
  if (session.has(key)) return session.get(key) as T;
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}
export function writeSaved<T>(key: string, value: T | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
    session.delete(key);
    errors.delete(key);
  } catch {
    session.set(key, value);
    errors.set(
      key,
      'Stockage indisponible : changements conservés pour cette session seulement. Ne fermez pas cette page avant de les sauvegarder.',
    );
  }
  dispatchEvent(new Event(event));
}
export function useSavedState<T>(key: string, fallback: T) {
  const [value, setValue] = useState(() => readSaved(key, fallback));
  const [error, setError] = useState(() => errors.get(key) ?? '');
  useEffect(() => {
    const sync = () => {
      setValue(readSaved(key, fallback));
      setError(errors.get(key) ?? '');
    };
    addEventListener(event, sync);
    addEventListener('storage', sync);
    return () => {
      removeEventListener(event, sync);
      removeEventListener('storage', sync);
    };
  }, [key]);
  const save = (next: T | ((old: T) => T)) =>
    writeSaved(
      key,
      typeof next === 'function'
        ? (next as (old: T) => T)(readSaved(key, fallback))
        : next,
    );
  return [value, save, error] as const;
}
