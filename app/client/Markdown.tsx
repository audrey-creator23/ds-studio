import type { ReactNode } from 'react';

// Rendu Markdown minimal sans HTML brut ni dépendance : titres, listes, code,
// gras, italique, code en ligne et liens http(s). Tout le reste reste du texte.
function inline(text: string, key: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern =
    /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*)|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const k = `${key}-${match.index}`;
    if (match[1]) nodes.push(<code key={k}>{match[1].slice(1, -1)}</code>);
    else if (match[2])
      nodes.push(<strong key={k}>{match[2].slice(2, -2)}</strong>);
    else if (match[3]) nodes.push(<em key={k}>{match[3].slice(1, -1)}</em>);
    else
      nodes.push(
        <a key={k} href={match[5]} target="_blank" rel="noreferrer">
          {match[4]}
        </a>,
      );
    last = pattern.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export default function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('```')) {
      const code: string[] = [];
      while (++i < lines.length && !lines[i].startsWith('```'))
        code.push(lines[i]);
      blocks.push(
        <pre key={i}>
          <code>{code.join('\n')}</code>
        </pre>,
      );
    } else if (/^#{1,4}\s/.test(line)) {
      blocks.push(
        <p key={i} className="md-heading">
          {inline(line.replace(/^#+\s/, ''), `h${i}`)}
        </p>,
      );
    } else if (/^\s*([-*]|\d+\.)\s/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s/.test(lines[i]))
        items.push(lines[i++].replace(/^\s*([-*]|\d+\.)\s/, ''));
      i--;
      const List = ordered ? 'ol' : 'ul';
      blocks.push(
        <List key={i}>
          {items.map((item, n) => (
            <li key={n}>{inline(item, `l${i}-${n}`)}</li>
          ))}
        </List>,
      );
    } else if (line.trim()) {
      blocks.push(<p key={i}>{inline(line, `p${i}`)}</p>);
    }
  }
  return <div className="markdown">{blocks}</div>;
}
