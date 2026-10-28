import { useEffect, useState } from 'react';
import {
  Bell,
  BellOff,
  Check,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Trash2,
} from 'lucide-react';
import type { Note } from '../shared/steps.js';
import { useUserData } from './useUserData.js';
import { Button, Card } from './ui.js';

// Mes notes : tableau de notes épinglées, enregistrées par le serveur.
// Rappels réels (date/heure) déclenchés par useReminders tant que DS-Studio
// est ouvert : notification du système si autorisée, sinon alerte intégrée.
const colors: Note['color'][] = ['1', '3', '5', '7', '9'];
const now = () => new Date().toISOString();
const local = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const when = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

export function useReminders(onFire: (note: Note) => void) {
  const { data, save } = useUserData();
  useEffect(() => {
    if (!data) return;
    const tick = () => {
      const due = data.notes.filter(
        (n) => n.remindAt && !n.remindedAt && n.remindAt <= now(),
      );
      if (!due.length) return;
      due.forEach((n) => {
        onFire(n);
        if ('Notification' in window && Notification.permission === 'granted')
          new Notification('Rappel DS-Studio', { body: n.text.slice(0, 180) });
      });
      const ids = due.map((n) => n.id);
      void save('notes', (notes) =>
        notes.map((n) =>
          ids.includes(n.id) ? { ...n, remindedAt: now() } : n,
        ),
      ).catch(() => undefined);
    };
    tick();
    const t = setInterval(tick, 15000);
    return () => clearInterval(t);
  }, [data]);
}

function NoteCard({
  note,
  onChange,
  onDelete,
}: {
  note: Note;
  onChange: (patch: Partial<Note>) => Promise<void>;
  onDelete: () => void;
}) {
  // Édition : texte et couleur en brouillon, enregistrés par « Valider ».
  // Validée : lecture seule, fond de la teinte choisie ; crayon pour rééditer.
  const [editing, setEditing] = useState(!note.text);
  const [text, setText] = useState(note.text);
  const [color, setColor] = useState(note.color);
  const [busy, setBusy] = useState(false);
  const [at, setAt] = useState(local(note.remindAt));
  useEffect(() => setAt(local(note.remindAt)), [note.remindAt]);
  function edit() {
    setText(note.text);
    setColor(note.color);
    setEditing(true);
  }
  async function validate() {
    setBusy(true);
    try {
      await onChange({ text: text.trim(), color });
      setEditing(false);
    } catch {
      // Erreur affichée par la page ; la note reste en édition.
    } finally {
      setBusy(false);
    }
  }
  async function schedule() {
    if (!at) return;
    const iso = new Date(at).toISOString();
    if ('Notification' in window && Notification.permission === 'default')
      await Notification.requestPermission().catch(() => undefined);
    await onChange({ remindAt: iso, remindedAt: null });
  }
  return (
    <Card
      className="note"
      data-color={editing ? color : note.color}
      data-state={editing ? 'edit' : 'done'}
      aria-label="Note"
    >
      <div className="note-head">
        {editing ? (
          <span className="note-colors" role="group" aria-label="Couleur">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                className="swatch"
                data-color={c}
                aria-label={`Couleur ${c}`}
                aria-pressed={color === c}
                onClick={() => setColor(c)}
              />
            ))}
          </span>
        ) : (
          <span className="note-colors" />
        )}
        <Button
          variant="ghost"
          size="icon"
          aria-label={note.pinned ? 'Désépingler' : 'Épingler'}
          title={note.pinned ? 'Désépingler' : 'Épingler'}
          aria-pressed={note.pinned}
          onClick={() => void onChange({ pinned: !note.pinned })}
        >
          {note.pinned ? (
            <Pin size={15} aria-hidden="true" />
          ) : (
            <PinOff size={15} aria-hidden="true" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Supprimer la note"
          title="Supprimer la note"
          onClick={onDelete}
        >
          <Trash2 size={15} aria-hidden="true" />
        </Button>
      </div>
      {editing ? (
        <textarea
          className="note-text"
          aria-label="Texte de la note"
          maxLength={2000}
          rows={4}
          autoFocus={!note.text}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      ) : (
        <p className="note-read">{note.text}</p>
      )}
      <div className="note-reminder">
        {note.remindAt && !note.remindedAt ? (
          <>
            <span className="muted small">
              <Bell size={13} aria-hidden="true" /> Rappel le{' '}
              {when(note.remindAt)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                void onChange({ remindAt: null, remindedAt: null })
              }
            >
              <BellOff size={13} aria-hidden="true" /> Annuler
            </Button>
          </>
        ) : (
          <>
            <input
              type="datetime-local"
              className="input input-sm"
              aria-label="Date et heure du rappel"
              min={local(now())}
              value={at}
              onChange={(e) => setAt(e.target.value)}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={!at || new Date(at) <= new Date()}
              onClick={() => void schedule()}
            >
              <Bell size={13} aria-hidden="true" /> Programmer
            </Button>
          </>
        )}
        {note.remindedAt && (
          <span className="muted small">
            Rappelé le {when(note.remindedAt)}
          </span>
        )}
      </div>
      <div className="note-foot">
        {editing ? (
          <Button
            size="sm"
            disabled={busy || !text.trim()}
            onClick={() => void validate()}
          >
            <Check size={14} aria-hidden="true" /> Valider
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Modifier la note"
            title="Modifier la note"
            onClick={edit}
          >
            <Pencil size={15} aria-hidden="true" />
          </Button>
        )}
      </div>
    </Card>
  );
}

export default function Notes() {
  const { data, error, save } = useUserData();
  const notes = [...(data?.notes ?? [])].sort(
    (a, b) =>
      Number(b.pinned) - Number(a.pinned) ||
      b.updatedAt.localeCompare(a.updatedAt),
  );
  const write = (fn: (notes: Note[]) => Note[]) => save('notes', fn);
  const patch = (id: string, p: Partial<Note>) =>
    write((notes) =>
      notes.map((n) => (n.id === id ? { ...n, ...p, updatedAt: now() } : n)),
    );
  const permission =
    'Notification' in window ? Notification.permission : 'unsupported';
  return (
    <div className="page notes">
      <header className="page-header">
        <h1 id="page-title" tabIndex={-1}>
          Mes notes
        </h1>
        <p className="lead">Idées et rappels épinglés pour le PFE</p>
      </header>
      <div className="row">
        <p className="muted small" role="status">
          {permission === 'granted'
            ? 'Rappels : notifications du système activées (DS-Studio doit rester ouvert).'
            : permission === 'denied'
              ? 'Notifications refusées par le navigateur : les rappels s’affichent dans DS-Studio, tant qu’il est ouvert.'
              : 'Les rappels s’affichent tant que DS-Studio est ouvert ; la notification du système est demandée au premier rappel.'}
        </p>
        <Button
          size="sm"
          disabled={!data}
          onClick={() =>
            void write((notes) => [
              {
                id: `note-${Date.now().toString(36)}`,
                text: '',
                color: '1',
                pinned: true,
                remindAt: null,
                remindedAt: null,
                updatedAt: now(),
              },
              ...notes,
            ])
          }
        >
          <Plus size={14} aria-hidden="true" /> Nouvelle note
        </Button>
      </div>
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
      {!data ? (
        <p className="muted">Chargement…</p>
      ) : notes.length ? (
        <div className="notes-board">
          {notes.map((n) => (
            <NoteCard
              key={n.id}
              note={n}
              onChange={(p) => patch(n.id, p)}
              onDelete={() =>
                confirm('Supprimer cette note ?') &&
                void write((notes) => notes.filter((x) => x.id !== n.id))
              }
            />
          ))}
        </div>
      ) : (
        <Card className="notes-empty">
          <p>Aucune note. Créez-en une pour garder une idée ou un rappel.</p>
        </Card>
      )}
    </div>
  );
}
