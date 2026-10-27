import { useEffect, useState } from 'react';
import { ExternalLink, Plus, Trash2 } from 'lucide-react';
import { Button, Card } from './ui.js';

// Mes schémas : un onglet par type de recherche, chacun relié à des
// tableaux FigJam. Intégration officielle Figma (iframe d'embed, lecture
// seule, droits du compte Figma de la personne) ; rien n'est écrit dans
// FigJam. Liens enregistrés sur ce poste.
const tabs = [
  'Entretiens utilisateurs',
  'Benchmark',
  'Parcours utilisateurs',
  'Personas',
  'Mind maps',
  'Architecture de l’information',
  'Synthèse de recherche',
] as const;
type Board = { name: string; url: string };
type Boards = Record<string, Board[]>;
const key = 'ds-v3-schemas';

// Seuls les liens de tableaux FigJam (figma.com/board/…) sont acceptés.
export function figmaBoard(raw: string) {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== 'https:' || !/^(www\.)?figma\.com$/.test(u.hostname))
      return;
    if (!/^\/board\/[A-Za-z0-9]{10,}/.test(u.pathname)) return;
    return u.toString();
  } catch {
    return;
  }
}
// Intégration officielle actuelle de Figma : embed.figma.com + embed-host.
export function embed(url: string) {
  const u = new URL(url);
  const out = new URL(`https://embed.figma.com${u.pathname}`);
  const node = u.searchParams.get('node-id');
  if (node) out.searchParams.set('node-id', node);
  out.searchParams.set('embed-host', 'ds-studio');
  return out.toString();
}

function read(): Boards {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}');
  } catch {
    return {};
  }
}

export default function Schemas() {
  const [tab, setTab] = useState<string>(tabs[0]);
  const [boards, setBoards] = useState<Boards>(read);
  const [active, setActive] = useState(0);
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(boards));
    } catch {
      setError(
        'Enregistrement local indisponible : liens gardés pour la session.',
      );
    }
  }, [boards]);
  useEffect(() => setActive(0), [tab]);
  const list = boards[tab] ?? [];
  const current = list[active];

  function add() {
    const valid = figmaBoard(url);
    if (!valid)
      return setError(
        'Lien non reconnu : collez un lien FigJam (https://www.figma.com/board/…).',
      );
    setBoards({
      ...boards,
      [tab]: [
        ...list,
        { name: name.trim() || `Tableau ${list.length + 1}`, url: valid },
      ],
    });
    setActive(list.length);
    setUrl('');
    setName('');
    setError('');
  }
  function remove(i: number) {
    if (
      !confirm(
        `Retirer « ${list[i].name} » de cet onglet ? Le tableau FigJam n’est pas supprimé.`,
      )
    )
      return;
    setBoards({ ...boards, [tab]: list.filter((_, x) => x !== i) });
    setActive(0);
  }

  return (
    <div className="page schemas">
      <header className="page-header">
        <h1 id="page-title" tabIndex={-1}>
          Mes schémas
        </h1>
        <p className="lead">Recherches, parcours et idées au même endroit</p>
      </header>
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
            {(boards[t]?.length ?? 0) > 0 && (
              <small> · {boards[t].length}</small>
            )}
          </button>
        ))}
      </div>
      <Card className="schema-card" aria-label={tab}>
        <div className="schema-head">
          {list.length > 0 && (
            <div
              className="schema-boards"
              role="group"
              aria-label="Tableaux de l’onglet"
            >
              {list.map((b, i) => (
                <span key={b.url + i} className="schema-board">
                  <button
                    type="button"
                    aria-pressed={i === active}
                    onClick={() => setActive(i)}
                  >
                    {b.name}
                  </button>
                  <button
                    type="button"
                    className="schema-remove"
                    aria-label={`Retirer ${b.name}`}
                    onClick={() => remove(i)}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </span>
              ))}
            </div>
          )}
          {current && (
            <a
              className="button"
              data-variant="outline"
              data-size="sm"
              href={current.url}
              target="_blank"
              rel="noreferrer"
            >
              Ouvrir dans FigJam <ExternalLink size={14} aria-hidden="true" />
              <span className="sr-only"> (nouvel onglet)</span>
            </a>
          )}
        </div>
        <div className="schema-view">
          {current ? (
            <iframe
              key={current.url}
              title={`FigJam · ${current.name}`}
              src={embed(current.url)}
              allowFullScreen
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="schema-empty">
              <p>Aucun tableau FigJam pour « {tab} ».</p>
              <p className="muted small">
                Le tableau s’affiche via l’intégration officielle de Figma, avec
                les droits de votre compte Figma (lecture seule ici). S’il est
                privé, Figma demande de se connecter dans le cadre.
              </p>
            </div>
          )}
        </div>
        <form
          className="schema-add"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <input
            className="input input-sm"
            aria-label="Nom du tableau"
            placeholder="Nom (facultatif)"
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="input input-sm"
            aria-label="Lien FigJam"
            placeholder="https://www.figma.com/board/…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <Button type="submit" size="sm" disabled={!url.trim()}>
            <Plus size={14} aria-hidden="true" /> Ajouter
          </Button>
        </form>
        {error && (
          <p className="alert-text" role="alert">
            {error}
          </p>
        )}
      </Card>
    </div>
  );
}
