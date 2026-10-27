import { useEffect, useMemo, useRef, useState } from 'react';
import {
  tokenKeys,
  tokensSchema,
  type TokenKey,
  type TokenValue,
  type Tokens,
} from '../../shared/model.js';

// Brouillon de plusieurs tokens : rien n'est écrit sur disque avant
// « Enregistrer » puis la validation du diff. Le brouillon survit au
// rechargement de l'onglet (sessionStorage facultatif).
type Values = Partial<Record<TokenKey, string>>;
const storageKey = 'ds-studio-design-draft-v1';

function load(): Values {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) || '{}');
    return Object.fromEntries(
      Object.entries(saved).filter(
        ([k, v]) =>
          tokenKeys.includes(k as TokenKey) &&
          typeof v === 'string' &&
          v.length <= 100,
      ),
    );
  } catch {
    return {};
  }
}

export function parseToken(key: TokenKey, raw: string) {
  const type = tokensSchema.shape[key].shape.$type.value;
  const value: TokenValue = type === 'dimension' ? Number(raw) : raw;
  const result = tokensSchema.shape[key].safeParse({
    $type: type,
    $value: value,
  });
  return result.success
    ? { value }
    : {
        error:
          type === 'color'
            ? 'Couleur attendue : #RRGGBB'
            : type === 'dimension'
              ? 'Nombre de 0 à 128'
              : 'Police non disponible',
      };
}

export function useDesignDraft(saved: Tokens | undefined) {
  const [values, setValues] = useState<Values>(load);
  const [past, setPast] = useState<Values[]>([]);
  const [future, setFuture] = useState<Values[]>([]);
  const [recovered] = useState(() => Object.keys(load()).length > 0);
  const lastEdit = useRef<{ key: TokenKey; at: number } | undefined>(undefined);
  useEffect(() => {
    try {
      if (Object.keys(values).length)
        sessionStorage.setItem(storageKey, JSON.stringify(values));
      else sessionStorage.removeItem(storageKey);
    } catch {
      /* Stockage refusé : brouillon en mémoire seulement. */
    }
  }, [values]);
  // Après validation, les valeurs devenues identiques au disque disparaissent.
  useEffect(() => {
    if (!saved) return;
    setValues((current) => {
      const kept = Object.fromEntries(
        Object.entries(current).filter(
          ([k, v]) => v !== String(saved[k as TokenKey].$value),
        ),
      );
      return Object.keys(kept).length === Object.keys(current).length
        ? current
        : kept;
    });
  }, [saved]);

  function commitValues(next: Values, coalesceKey?: TokenKey) {
    const now = Date.now();
    const coalesce =
      coalesceKey &&
      lastEdit.current?.key === coalesceKey &&
      now - lastEdit.current.at < 800;
    if (!coalesce) setPast((p) => [...p.slice(-49), values]);
    lastEdit.current = coalesceKey ? { key: coalesceKey, at: now } : undefined;
    setFuture([]);
    setValues(next);
  }
  function set(key: TokenKey, raw: string) {
    const next = { ...values };
    if (saved && raw === String(saved[key].$value)) delete next[key];
    else next[key] = raw;
    commitValues(next, key);
  }
  function resetKey(key: TokenKey) {
    const next = { ...values };
    delete next[key];
    commitValues(next);
  }
  function resetAll() {
    commitValues({});
  }
  function undo() {
    if (!past.length) return;
    setFuture((f) => [values, ...f]);
    setValues(past[past.length - 1]);
    setPast((p) => p.slice(0, -1));
    lastEdit.current = undefined;
  }
  function redo() {
    if (!future.length) return;
    setPast((p) => [...p, values]);
    setValues(future[0]);
    setFuture((f) => f.slice(1));
    lastEdit.current = undefined;
  }

  const derived = useMemo(() => {
    const errors: Partial<Record<TokenKey, string>> = {};
    const changes: { key: TokenKey; value: TokenValue }[] = [];
    const preview = saved ? structuredClone(saved) : undefined;
    for (const key of tokenKeys) {
      const raw = values[key];
      if (raw === undefined) continue;
      const parsed = parseToken(key, raw);
      if ('error' in parsed) errors[key] = parsed.error;
      else {
        changes.push({ key, value: parsed.value });
        if (preview) preview[key].$value = parsed.value as never;
      }
    }
    return { errors, changes, preview };
  }, [values, saved]);

  return {
    values,
    raw: (key: TokenKey) =>
      values[key] ?? (saved ? String(saved[key].$value) : ''),
    modified: (key: TokenKey) => values[key] !== undefined,
    set,
    resetKey,
    resetAll,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    recovered,
    ...derived,
  };
}
export type DesignDraft = ReturnType<typeof useDesignDraft>;
