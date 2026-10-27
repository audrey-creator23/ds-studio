import { useEffect, useState } from 'react';
import { request } from '../api.js';
import {
  emptyComposition,
  newItem,
  newSection,
  normalizeComposition,
  type BlockKind,
  type Composition,
  type Item,
  type Layout,
  type Section,
} from '../../shared/composition.js';

// Brouillon de composition : bibliothèque → composition → aperçu → validation.
// Le brouillon survit au rechargement (localStorage facultatif) ; seule
// « Enregistrer la page » écrit sur disque, dans un fichier séparé des tokens.
const draftKey = 'ds-studio-composition-draft-v1';

export function starterComposition(): Composition {
  const page = emptyComposition('Accueil ateliers');
  const head = { ...newSection('stack'), name: 'En-tête' };
  head.items = [
    newItem('navigation'),
    { ...newItem('heading', 'kicker'), text: 'LE QUOTIDIEN, AUTREMENT' },
    newItem('heading'),
    newItem('text'),
  ];
  const cards = { ...newSection('grid', 2), name: 'Ateliers' };
  cards.items = [newItem('card'), { ...newItem('card', 'accent') }];
  return { ...page, sections: [head, cards] };
}
function load(): Composition {
  try {
    return (
      normalizeComposition(
        JSON.parse(localStorage.getItem(draftKey) || 'null'),
      ) ?? starterComposition()
    );
  } catch {
    return starterComposition();
  }
}
const same = (a?: Composition, b?: Composition) => {
  const strip = (c?: Composition) =>
    c && JSON.stringify({ ...c, updatedAt: undefined });
  return strip(a) === strip(b);
};
const findItem = (c: Composition, id: string) => {
  for (const s of c.sections) {
    const index = s.items.findIndex((i) => i.id === id);
    if (index >= 0) return { section: s, index, item: s.items[index] };
  }
};

export interface ComposeTurn {
  role: 'user' | 'assistant';
  text: string;
  question?: boolean;
}
export interface Proposal {
  composition: Composition;
  changes: string[];
  reply: string;
}

export function useComposition() {
  const [draft, setDraft] = useState<Composition>(load);
  const [past, setPast] = useState<Composition[]>([]);
  const [future, setFuture] = useState<Composition[]>([]);
  const [saved, setSaved] = useState<Composition[]>([]);
  const [composer, setComposer] = useState<{
    available: boolean;
    detail: string;
  }>();
  const [model, setModel] = useState('');
  const [selected, setSelected] = useState<string>();
  const [proposal, setProposal] = useState<Proposal>();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  // Conversation de composition conservée quand on change de page.
  const [turns, setTurns] = useState<ComposeTurn[]>([]);
  useEffect(() => {
    request<{
      compositions: Composition[];
      composer: { available: boolean; detail: string };
      model: string;
    }>('compositions').then(
      (r) => {
        setSaved(r.compositions);
        setComposer(r.composer);
        setModel(r.model);
      },
      (e: Error) => setError(e.message),
    );
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch {
      /* Stockage refusé : brouillon en mémoire seulement. */
    }
  }, [draft]);

  function update(change: (c: Composition) => Composition) {
    const next = change(structuredClone(draft));
    if (same(next, draft)) return;
    setPast((p) => [...p.slice(-49), draft]);
    setFuture([]);
    setDraft(next);
    setNotice('');
  }
  function replace(next: Composition) {
    setPast([]);
    setFuture([]);
    setDraft(next);
    setSelected(undefined);
    setProposal(undefined);
  }
  const target = (c: Composition) =>
    c.sections.find((s) => s.id === selected) ??
    (selected && findItem(c, selected)?.section) ??
    c.sections.at(-1);

  const savedVersion = saved.find((c) => c.id === draft.id);
  return {
    draft,
    saved,
    savedVersion,
    dirty: !same(draft, savedVersion),
    composer,
    model,
    selected,
    select: setSelected,
    proposal,
    setProposal,
    error,
    setError,
    notice,
    busy,
    turns,
    setTurns,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    undo() {
      if (!past.length) return;
      setFuture((f) => [draft, ...f]);
      setDraft(past[past.length - 1]);
      setPast((p) => p.slice(0, -1));
    },
    redo() {
      if (!future.length) return;
      setPast((p) => [...p, draft]);
      setDraft(future[0]);
      setFuture((f) => f.slice(1));
    },
    addItem(kind: BlockKind, variant?: string) {
      const item = newItem(kind, variant);
      update((c) => {
        let section = target(c);
        if (!section) {
          section = newSection('stack');
          c.sections.push(section);
        }
        if (section.items.length >= 16) {
          setError('16 éléments maximum par section.');
          return c;
        }
        section.items.push(item);
        return c;
      });
      setSelected(item.id);
    },
    addSection(layout: Layout, columns = 1) {
      const section = newSection(layout, columns);
      update((c) => {
        if (c.sections.length >= 12) {
          setError('12 sections maximum.');
          return c;
        }
        c.sections.push(section);
        return c;
      });
      setSelected(section.id);
    },
    patchItem(id: string, patch: Partial<Item>) {
      update((c) => {
        const found = findItem(c, id);
        if (found)
          found.section.items[found.index] = { ...found.item, ...patch };
        return c;
      });
    },
    patchSection(id: string, patch: Partial<Section>) {
      update((c) => {
        c.sections = c.sections.map((s) =>
          s.id === id ? { ...s, ...patch } : s,
        );
        return c;
      });
    },
    // Réorganisation : l'ordre dans la structure est l'ordre visuel, la mise
    // en page responsive reste celle de la section.
    move(id: string, delta: -1 | 1) {
      update((c) => {
        const si = c.sections.findIndex((s) => s.id === id);
        if (si >= 0) {
          const to = si + delta;
          if (to < 0 || to >= c.sections.length) return c;
          const [s] = c.sections.splice(si, 1);
          c.sections.splice(to, 0, s);
          return c;
        }
        const found = findItem(c, id);
        if (!found) return c;
        const to = found.index + delta;
        const sectionIndex = c.sections.indexOf(found.section);
        const items = found.section.items;
        if (to >= 0 && to < items.length) {
          items.splice(found.index, 1);
          items.splice(to, 0, found.item);
        } else {
          // Au bord d'une section : passe dans la section voisine.
          const next = c.sections[sectionIndex + delta];
          if (!next || next.items.length >= 16) return c;
          items.splice(found.index, 1);
          if (delta < 0) next.items.push(found.item);
          else next.items.unshift(found.item);
        }
        return c;
      });
    },
    moveTo(id: string, sectionId: string, index?: number) {
      update((c) => {
        const found = findItem(c, id);
        const dest = c.sections.find((s) => s.id === sectionId);
        if (!found || !dest) return c;
        if (dest !== found.section && dest.items.length >= 16) return c;
        found.section.items.splice(found.index, 1);
        dest.items.splice(index ?? dest.items.length, 0, found.item);
        return c;
      });
    },
    remove(id: string) {
      update((c) => {
        c.sections = c.sections
          .filter((s) => s.id !== id)
          .map((s) => ({ ...s, items: s.items.filter((i) => i.id !== id) }));
        return c;
      });
      setSelected(undefined);
    },
    duplicate(id: string) {
      update((c) => {
        const found = findItem(c, id);
        if (found && found.section.items.length < 16)
          found.section.items.splice(found.index + 1, 0, {
            ...found.item,
            id: newItem(found.item.kind).id,
          });
        return c;
      });
    },
    // Restaure une version enregistrée dans le brouillon (annulable).
    restore(version: Composition) {
      const next = normalizeComposition(version);
      if (!next) return;
      update(() => next);
      setSelected(undefined);
      setNotice('Version restaurée dans le brouillon. Annulable.');
    },
    rename(name: string) {
      update((c) => ({ ...c, name }));
    },
    applyProposal() {
      if (!proposal) return;
      update(() => proposal.composition);
      setProposal(undefined);
      setNotice('Proposition appliquée au brouillon. Annulable.');
    },
    async save() {
      setError('');
      setBusy(true);
      try {
        const name = draft.name.trim() || 'Nouvelle page';
        const r = await request<{ compositions: Composition[] }>(
          'compositions',
          { composition: { ...draft, name, updatedAt: undefined } },
        );
        setSaved(r.compositions);
        setDraft((d) => ({ ...d, name }));
        setNotice(`Page « ${name} » enregistrée. Tokens inchangés.`);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    open(id: string) {
      const next =
        id === 'new' ? emptyComposition() : saved.find((c) => c.id === id);
      if (!next) return;
      replace(normalizeComposition(next)!);
    },
    revert() {
      if (savedVersion) replace(normalizeComposition(savedVersion)!);
    },
    async deletePage() {
      setError('');
      try {
        const r = await request<{ compositions: Composition[] }>(
          'compositions/delete',
          { id: draft.id },
        );
        setSaved(r.compositions);
        replace(
          r.compositions[0]
            ? normalizeComposition(r.compositions[0])!
            : emptyComposition(),
        );
        setNotice('Page supprimée.');
      } catch (e) {
        setError((e as Error).message);
      }
    },
  };
}
export type CompositionState = ReturnType<typeof useComposition>;
