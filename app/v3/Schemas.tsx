import { useEffect, useRef, useState } from 'react';
import {
  Download,
  ExternalLink,
  FileText,
  Pencil,
  Upload,
  X,
} from 'lucide-react';
import { Button, Card } from './ui.js';
import { SchemaExample } from './SchemaExamples.js';
import { deleteFile, getFile, putFile } from './fileStore.js';

// Mes schémas : un onglet par type de recherche, un document par onglet.
// Vide : aperçu illustratif FICTIF. Importé : le vrai contenu (tableau
// Figma/FigJam intégré officiellement, image ou PDF du poste) ou, pour les
// autres services, une fiche avec lien — jamais de faux embed. Lecture seule.
const builtIn = [
  'Benchmark',
  'Entretiens utilisateurs',
  'Parcours utilisateurs',
  'Personas',
  'Mind maps',
  'Architecture de l’information',
  'Synthèse de recherche',
] as const;
type Source =
  | { kind: 'link'; url: string; provider: string }
  | { kind: 'file'; id: string; type: string; fileName: string; size: number };
// Tableau « parti de zéro » : éléments éditables (texte, couleur palette).
type Node = { id: string; text: string; color: '1' | '3' | '5' | '7' | '9' };
type Entry = { name: string; source?: Source; board?: { nodes: Node[] } };
const tabsKey = 'ds-v3-schema-tabs';
const colors: Node['color'][] = ['1', '3', '5', '7', '9'];
const newNode = (text = 'Nouvel élément', i = 0): Node => ({
  id: Math.random().toString(36).slice(2, 10),
  text,
  color: colors[i % colors.length],
});
const key = 'ds-v3-schemas-v2';

// Services acceptés par lien ; seul Figma/FigJam a une intégration officielle.
const providers: [RegExp, string][] = [
  [/^(www\.)?figma\.com$/, 'Figma'],
  [/^(www\.)?miro\.com$/, 'Miro'],
  [/^(www\.)?mindmeister\.com$/, 'MindMeister'],
  [/^(www\.)?whimsical\.com$/, 'Whimsical'],
  [/^(www\.)?(notion\.so|app\.notion\.com|[\w-]+\.notion\.site)$/, 'Notion'],
  [/^(www\.)?canva\.com$/, 'Canva'],
  [/^(www\.)?lucid\.app$/, 'Lucidchart'],
  [/^docs\.google\.com$/, 'Google Docs'],
];
export function readLink(raw: string): Source | undefined {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== 'https:') return;
    const p = providers.find(([re]) => re.test(u.hostname));
    return p ? { kind: 'link', url: u.toString(), provider: p[1] } : undefined;
  } catch {
    return;
  }
}
// Intégration officielle Figma (embed.figma.com) pour les fichiers et tableaux.
export function figmaEmbed(url: string) {
  const u = new URL(url);
  if (!/^\/(board|design|file|proto)\/[A-Za-z0-9]{10,}/.test(u.pathname))
    return;
  const out = new URL(`https://embed.figma.com${u.pathname}`);
  const node = u.searchParams.get('node-id');
  if (node) out.searchParams.set('node-id', node);
  out.searchParams.set('embed-host', 'ds-studio');
  return out.toString();
}
const fileTypes: Record<string, number> = {
  'image/png': 10,
  'image/jpeg': 10,
  'image/webp': 10,
  'image/gif': 10,
  'image/svg+xml': 2,
  'application/pdf': 20,
};

function read(): Record<string, Entry> {
  try {
    const v2 = localStorage.getItem(key);
    if (v2) return JSON.parse(v2);
    // Reprise des liens FigJam de la version précédente (premier par onglet).
    const old = JSON.parse(
      localStorage.getItem('ds-v3-schemas') || '{}',
    ) as Record<string, { name: string; url: string }[]>;
    return Object.fromEntries(
      Object.entries(old)
        .filter(([, list]) => list?.length)
        .map(([tab, [b]]) => [
          tab,
          {
            name: b.name,
            source: { kind: 'link', url: b.url, provider: 'Figma' },
          },
        ]),
    );
  } catch {
    return {};
  }
}

function Content({ entry }: { entry: Entry }) {
  const src = entry.source!;
  const [url, setUrl] = useState<string>();
  const [error, setError] = useState('');
  useEffect(() => {
    if (src.kind !== 'file') return;
    let made = '';
    getFile(src.id).then(
      (blob) => {
        if (!blob)
          return setError('Fichier introuvable sur ce poste : réimportez-le.');
        made = URL.createObjectURL(blob);
        setUrl(made);
      },
      () => setError('Stockage local indisponible.'),
    );
    return () => {
      if (made) URL.revokeObjectURL(made);
    };
  }, [src]);
  if (src.kind === 'link') {
    const embed = src.provider === 'Figma' ? figmaEmbed(src.url) : undefined;
    return embed ? (
      <iframe
        title={`${src.provider} · ${entry.name || 'document'}`}
        src={embed}
        allowFullScreen
        referrerPolicy="no-referrer"
      />
    ) : (
      <div className="schema-file">
        <ExternalLink size={28} aria-hidden="true" />
        <strong>{entry.name || src.provider}</strong>
        <span className="muted">
          Lien {src.provider} · aperçu intégré non disponible pour ce service
        </span>
        <a
          className="button"
          data-variant="outline"
          data-size="sm"
          href={src.url}
          target="_blank"
          rel="noreferrer"
        >
          Ouvrir dans {src.provider}
        </a>
      </div>
    );
  }
  if (error) return <p className="alert-text schema-file">{error}</p>;
  if (!url) return <p className="muted schema-file">Chargement…</p>;
  return src.type === 'application/pdf' ? (
    <iframe title={`PDF · ${src.fileName}`} src={url} />
  ) : (
    <img className="schema-img" src={url} alt={entry.name || src.fileName} />
  );
}

function ImportDialog({
  tab,
  onClose,
  onSave,
}: {
  tab: string;
  onClose: () => void;
  onSave: (source: Source, file?: File) => Promise<void>;
}) {
  const [mode, setMode] = useState<'link' | 'file'>('link');
  const [link, setLink] = useState('');
  const [file, setFile] = useState<File>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string>();
  useEffect(() => {
    if (!file?.type.startsWith('image/')) return setPreview(undefined);
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  async function save() {
    setError('');
    let source: Source | undefined;
    if (mode === 'link') {
      source = readLink(link);
      if (!source)
        return setError(
          'Lien non reconnu : https://… vers Figma, FigJam, Miro, MindMeister, Whimsical, Notion, Canva, Lucidchart ou Google Docs.',
        );
    } else {
      if (!file) return setError('Choisissez un fichier.');
      const max = fileTypes[file.type];
      if (!max)
        return setError(
          'Format non pris en charge : PNG, JPEG, WebP, GIF, SVG ou PDF.',
        );
      if (file.size > max * 1024 * 1024)
        return setError(
          `Fichier trop lourd : ${max} Mo maximum pour ce format.`,
        );
      source = {
        kind: 'file',
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: file.type,
        fileName: file.name,
        size: file.size,
      };
    }
    setBusy(true);
    try {
      await onSave(source, file);
      onClose();
    } catch (e) {
      setError((e as Error).message || 'Enregistrement impossible.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <div className="panel-head">
          <h2 id="import-title">Importer · {tab}</h2>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Fermer"
            onClick={onClose}
          >
            <X size={16} aria-hidden="true" />
          </Button>
        </div>
        <div className="toggle-group" role="group" aria-label="Source">
          <button
            type="button"
            aria-pressed={mode === 'link'}
            onClick={() => setMode('link')}
          >
            Depuis un lien
          </button>
          <button
            type="button"
            aria-pressed={mode === 'file'}
            onClick={() => setMode('file')}
          >
            Depuis mon ordinateur
          </button>
        </div>
        {mode === 'link' ? (
          <label className="prop">
            <span>
              Lien (Figma, FigJam, Miro, MindMeister, Whimsical, Notion…)
            </span>
            <input
              className="input"
              type="url"
              autoFocus
              placeholder="https://…"
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
            <small className="muted">
              Figma et FigJam s’affichent dans la carte (intégration officielle)
              ; les autres services gardent un lien d’ouverture.
            </small>
          </label>
        ) : (
          <label className="prop">
            <span>Fichier (PNG, JPEG, WebP, GIF, SVG, PDF)</span>
            <input
              className="input"
              type="file"
              accept={Object.keys(fileTypes).join(',')}
              onChange={(e) => setFile(e.target.files?.[0])}
            />
            {file && (
              <small className="muted">
                {file.name} · {(file.size / 1024 / 1024).toFixed(1)} Mo
              </small>
            )}
            {preview && (
              <img
                className="import-preview"
                src={preview}
                alt="Aperçu du fichier choisi"
              />
            )}
          </label>
        )}
        {error && (
          <p className="alert-text" role="alert">
            {error}
          </p>
        )}
        <div className="row">
          <span />
          <span className="row">
            <Button variant="outline" size="sm" onClick={onClose}>
              Annuler
            </Button>
            <Button size="sm" disabled={busy} onClick={() => void save()}>
              {busy ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </span>
        </div>
      </div>
    </div>
  );
}

// Tableau éditable : carte mentale pour les cartes et entretiens, post-it
// pour les autres types. Mode édition : texte, couleur, retrait.
function Board({
  tab,
  board,
  editing,
  onChange,
}: {
  tab: string;
  board: { nodes: Node[] };
  editing: boolean;
  onChange: (nodes: Node[]) => void;
}) {
  const set = (id: string, patch: Partial<Node>) =>
    onChange(board.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  const radial = /mind|entretien/i.test(tab);
  return (
    <div className={`board${radial ? ' board-radial' : ''}`}>
      {radial && <div className="board-center">{tab}</div>}
      {!board.nodes.length && (
        <p className="muted">
          Tableau vide : ajoutez un élément via le crayon.
        </p>
      )}
      {board.nodes.map((n) => (
        <div key={n.id} className="board-node" data-color={n.color}>
          {editing ? (
            <>
              <textarea
                className="board-text"
                aria-label="Texte de l’élément"
                value={n.text}
                maxLength={200}
                onChange={(e) => set(n.id, { text: e.target.value })}
              />
              <span className="board-tools">
                {colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="swatch"
                    data-color={c}
                    aria-label={`Couleur ${c}`}
                    aria-pressed={n.color === c}
                    onClick={() => set(n.id, { color: c })}
                  />
                ))}
                <button
                  type="button"
                  className="board-remove"
                  aria-label="Supprimer l’élément"
                  onClick={() =>
                    onChange(board.nodes.filter((x) => x.id !== n.id))
                  }
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </span>
            </>
          ) : (
            <span>{n.text}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function AddDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, mode: 'import' | 'zero') => void;
}) {
  const [type, setType] = useState('Carte d’empathie');
  const [custom, setCustom] = useState('');
  const name = (type === 'Autre' ? custom : type).trim();
  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <div className="panel-head">
          <h2 id="add-title">Ajouter un schéma</h2>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Fermer"
            onClick={onClose}
          >
            <X size={16} aria-hidden="true" />
          </Button>
        </div>
        <label className="prop">
          <span>Type de schéma</span>
          <select
            className="input"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {[
              'Carte d’empathie',
              'User flow',
              'Storyboard',
              'Moodboard',
              'Matrice d’impact',
              'Autre',
            ].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        {type === 'Autre' && (
          <label className="prop">
            <span>Nom du type</span>
            <input
              className="input"
              autoFocus
              maxLength={40}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
            />
          </label>
        )}
        <div className="row">
          <Button variant="outline" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <span className="row">
            <Button
              variant="outline"
              size="sm"
              disabled={!name}
              onClick={() => onCreate(name, 'import')}
            >
              <Upload size={14} aria-hidden="true" /> Importer
            </Button>
            <Button
              size="sm"
              disabled={!name}
              onClick={() => onCreate(name, 'zero')}
            >
              Partir de zéro
            </Button>
          </span>
        </div>
      </div>
    </div>
  );
}

function download(name: string, href: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  a.click();
}
const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase() || 'schema';

export default function Schemas() {
  const [extra, setExtra] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(tabsKey) || '[]');
    } catch {
      return [];
    }
  });
  const tabs = [...builtIn, ...extra];
  const [tab, setTab] = useState<string>(tabs[0]);
  const [entries, setEntries] = useState(read);
  const [importing, setImporting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const view = useRef<HTMLDivElement>(null);
  const menuRoot = useRef<HTMLDivElement>(null);
  const nameField = useRef<HTMLInputElement>(null);
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(entries));
      localStorage.setItem(tabsKey, JSON.stringify(extra));
    } catch {
      setError(
        'Enregistrement local indisponible : modifications gardées pour la session.',
      );
    }
  }, [entries, extra]);
  useEffect(() => {
    setEditing(false);
    setMenu(false);
    setNotice('');
  }, [tab]);
  useEffect(() => {
    if (!menu) return;
    const close = (e: Event) => {
      if (
        e instanceof KeyboardEvent
          ? e.key === 'Escape'
          : !menuRoot.current?.contains(e.target as globalThis.Node)
      )
        setMenu(false);
    };
    addEventListener('keydown', close);
    addEventListener('pointerdown', close);
    return () => {
      removeEventListener('keydown', close);
      removeEventListener('pointerdown', close);
    };
  }, [menu]);
  const entry = entries[tab] ?? { name: '' };
  const set = (next: Entry) => setEntries((e) => ({ ...e, [tab]: next }));

  async function save(source: Source, file?: File) {
    if (source.kind === 'file' && file) await putFile(source.id, file);
    const old = entry.source;
    if (old?.kind === 'file') await deleteFile(old.id).catch(() => undefined);
    set({ name: entry.name, source });
  }
  async function remove() {
    if (
      !confirm(
        `Retirer le contenu de « ${tab} » ? Le fichier ou le tableau d’origine n’est pas supprimé.`,
      )
    )
      return;
    if (entry.source?.kind === 'file')
      await deleteFile(entry.source.id).catch(() => undefined);
    set({ name: entry.name });
  }
  // Export réel : fichier d'origine, image PNG de la vue, ou lien (.url)
  // pour un contenu intégré d'un autre site (non capturable).
  async function exportView() {
    setError('');
    setNotice('');
    setBusy(true);
    const base = slug(entry.name || tab);
    try {
      if (entry.source?.kind === 'file') {
        const blob = await getFile(entry.source.id);
        if (!blob) throw new Error('Fichier introuvable sur ce poste.');
        const url = URL.createObjectURL(blob);
        download(entry.source.fileName, url);
        URL.revokeObjectURL(url);
      } else if (entry.source?.kind === 'link') {
        const url = URL.createObjectURL(
          new Blob([`[InternetShortcut]\r\nURL=${entry.source.url}\r\n`], {
            type: 'application/internet-shortcut',
          }),
        );
        download(`${base}.url`, url);
        URL.revokeObjectURL(url);
      } else {
        const { toPng } = await import('html-to-image');
        const node = view.current!;
        download(
          `${base}${entry.board ? '' : '-exemple-fictif'}.png`,
          await toPng(node, {
            pixelRatio: 2,
            backgroundColor: getComputedStyle(node).backgroundColor,
          }),
        );
      }
      setNotice('Export téléchargé.');
    } catch (e) {
      setError((e as Error).message || 'Export impossible.');
    } finally {
      setBusy(false);
    }
  }
  const nodes = entry.board?.nodes ?? [];
  const menuItems: [string, () => void][] = entry.board
    ? [
        [
          editing ? 'Terminer l’édition' : 'Modifier les textes et couleurs',
          () => setEditing(!editing),
        ],
        [
          'Ajouter un élément',
          () => {
            set({
              ...entry,
              board: { nodes: [...nodes, newNode(undefined, nodes.length)] },
            });
            setEditing(true);
          },
        ],
        ['Renommer le fichier', () => nameField.current?.focus()],
        [
          'Vider le tableau',
          () =>
            confirm('Retirer tous les éléments ?') &&
            set({ ...entry, board: { nodes: [] } }),
        ],
      ]
    : entry.source
      ? [
          ['Renommer le fichier', () => nameField.current?.focus()],
          ['Remplacer le contenu', () => setImporting(true)],
          ['Retirer le contenu', () => void remove()],
        ]
      : [
          [
            'Partir de zéro',
            () => {
              set({
                ...entry,
                board: {
                  nodes: [
                    newNode('Idée 1', 0),
                    newNode('Idée 2', 1),
                    newNode('Idée 3', 2),
                  ],
                },
              });
              setEditing(true);
            },
          ],
          ['Renommer le fichier', () => nameField.current?.focus()],
        ];

  return (
    <div className="page schemas">
      <header className="page-header">
        <h1 id="page-title" tabIndex={-1}>
          Mes schémas
        </h1>
        <p className="lead">Recherches, parcours et idées au même endroit</p>
      </header>
      <div className="schema-tabs-row">
        <div
          className="toggle-group schema-tabs"
          role="tablist"
          aria-label="Types de schémas"
        >
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
            >
              {t}
              {(entries[t]?.source || entries[t]?.board) && <small> · 1</small>}
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Ajouter un schéma"
          title="Ajouter un schéma"
          onClick={() => setAdding(true)}
        >
          <Pencil size={14} aria-hidden="true" />
        </Button>
      </div>
      <Card className="schema-card" aria-label={tab}>
        <div className="schema-head">
          <input
            ref={nameField}
            className="input input-sm schema-name"
            aria-label="Nom du fichier"
            placeholder="Nom du fichier (facultatif)"
            maxLength={60}
            value={entry.name}
            onChange={(e) => set({ ...entry, name: e.target.value })}
          />
          <span className="row">
            {entry.source?.kind === 'link' && (
              <a
                className="button"
                data-variant="outline"
                data-size="sm"
                href={entry.source.url}
                target="_blank"
                rel="noreferrer"
              >
                Ouvrir dans {entry.source.provider}{' '}
                <ExternalLink size={14} aria-hidden="true" />
                <span className="sr-only"> (nouvel onglet)</span>
              </a>
            )}
            {entry.source?.kind === 'file' && (
              <span className="muted small">
                <FileText size={14} aria-hidden="true" />{' '}
                {entry.source.fileName}
              </span>
            )}
            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => void exportView()}
            >
              <Download size={14} aria-hidden="true" /> Exporter
            </Button>
            <Button size="sm" onClick={() => setImporting(true)}>
              <Upload size={14} aria-hidden="true" />{' '}
              {entry.source ? 'Remplacer' : 'Importer'}
            </Button>
            <div className="menu-root" ref={menuRoot}>
              <Button
                variant="outline"
                size="icon"
                aria-label="Modifier le schéma"
                title="Modifier le schéma"
                aria-expanded={menu}
                aria-haspopup="menu"
                onClick={() => setMenu(!menu)}
              >
                <Pencil size={14} aria-hidden="true" />
              </Button>
              {menu && (
                <div
                  className="menu"
                  role="menu"
                  aria-label="Modifier le schéma"
                >
                  {menuItems.map(([label, run]) => (
                    <button
                      key={label}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenu(false);
                        run();
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </span>
        </div>
        <div className="schema-view" ref={view}>
          {entry.source ? (
            <Content key={tab} entry={entry} />
          ) : entry.board ? (
            <Board
              tab={tab}
              board={entry.board}
              editing={editing}
              onChange={(n) => set({ ...entry, board: { nodes: n } })}
            />
          ) : (
            <SchemaExample tab={tab} />
          )}
        </div>
        {(error || notice) && (
          <p
            className={error ? 'alert-text' : 'muted small'}
            role={error ? 'alert' : 'status'}
          >
            {error || notice}
          </p>
        )}
      </Card>
      {importing && (
        <ImportDialog
          tab={tab}
          onClose={() => setImporting(false)}
          onSave={save}
        />
      )}
      {adding && (
        <AddDialog
          onClose={() => setAdding(false)}
          onCreate={(name, mode) => {
            const unique = tabs.includes(name)
              ? `${name} ${tabs.length + 1}`
              : name;
            setExtra((x) => [...x, unique]);
            setEntries((e) => ({
              ...e,
              [unique]:
                mode === 'zero'
                  ? { name: '', board: { nodes: [newNode('Idée 1', 0)] } }
                  : { name: '' },
            }));
            setTab(unique);
            setAdding(false);
            if (mode === 'import') setImporting(true);
          }}
        />
      )}
    </div>
  );
}
