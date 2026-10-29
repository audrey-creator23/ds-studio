import { useEffect, useState } from 'react';
import { ExternalLink, Phone } from 'lucide-react';
import { authorities, contacts, kitBase, kitNeeds, risks } from './risks.js';

// Me préparer : trousse d'urgence (autonomie 72 h), socle commun +
// compléments par besoin et par risque, quantités selon le foyer.
// Progression gardée sur cet appareil.
type Kit = {
  adults: number;
  children: number;
  needs: string[];
  done: string[];
};
const KEY = 'ds-v3-trousse';
function read(): Kit {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (v && Array.isArray(v.done)) return v;
  } catch {
    // Préférence facultative.
  }
  return { adults: 1, children: 0, needs: [], done: [] };
}

export default function Preparer() {
  const [kit, setKit] = useState(read);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(kit));
    } catch {
      // Stockage indisponible : progression gardée pour la session.
    }
  }, [kit]);
  const people = Math.max(1, kit.adults + kit.children);
  const items = [
    ...kitBase.map((k) => ({
      id: k.id,
      label:
        'perPerson' in k
          ? `${k.label} : ${k.perPerson! * people} ${k.unit} (${k.perPerson} ${k.unit} × ${people} pers.)`
          : k.label,
      group: 'Socle commun',
    })),
    ...kitNeeds
      .filter((n) => kit.needs.includes(n.id))
      .flatMap((n) =>
        n.items.map((label) => ({
          id: `${n.id}:${label}`,
          label,
          group: n.label,
        })),
      ),
    ...risks.flatMap((r) =>
      r.kit.map((label) => ({ id: `${r.id}:${label}`, label, group: r.label })),
    ),
  ];
  const done = items.filter((i) => kit.done.includes(i.id)).length;
  const toggle = (id: string) =>
    setKit((k) => ({
      ...k,
      done: k.done.includes(id)
        ? k.done.filter((x) => x !== id)
        : [...k.done, id],
    }));
  const groups = [...new Set(items.map((i) => i.group))];
  return (
    <div className="carte-panel-body">
      <section className="carte-block" aria-label="Mon foyer">
        <h3>Mon foyer</h3>
        <div className="carte-household">
          <label>
            Adultes
            <input
              className="input input-sm"
              type="number"
              min={1}
              max={12}
              value={kit.adults}
              onChange={(e) =>
                setKit({
                  ...kit,
                  adults: Math.min(
                    12,
                    Math.max(1, Number(e.target.value) || 1),
                  ),
                })
              }
            />
          </label>
          <label>
            Enfants
            <input
              className="input input-sm"
              type="number"
              min={0}
              max={12}
              value={kit.children}
              onChange={(e) =>
                setKit({
                  ...kit,
                  children: Math.min(
                    12,
                    Math.max(0, Number(e.target.value) || 0),
                  ),
                })
              }
            />
          </label>
        </div>
        <fieldset className="carte-needs">
          <legend className="sr-only">Besoins particuliers</legend>
          {kitNeeds.map((n) => (
            <label key={n.id} className="chip-check">
              <input
                type="checkbox"
                checked={kit.needs.includes(n.id)}
                onChange={() =>
                  setKit({
                    ...kit,
                    needs: kit.needs.includes(n.id)
                      ? kit.needs.filter((x) => x !== n.id)
                      : [...kit.needs, n.id],
                  })
                }
              />
              {n.label}
            </label>
          ))}
        </fieldset>
      </section>
      <section className="carte-block" aria-label="Trousse d’urgence">
        <h3>Trousse d’urgence (72 h)</h3>
        <progress
          max={items.length}
          value={done}
          aria-label={`${done} éléments prêts sur ${items.length}`}
        />
        <small className="carte-stamp">
          {done} / {items.length} prêts · eau : 6 L par personne pour 72 h
          (guide gouvernemental « Tous responsables »).
        </small>
        {groups.map((g) => (
          <fieldset key={g} className="carte-check">
            <legend>{g}</legend>
            {items
              .filter((i) => i.group === g)
              .map((i) => (
                <label key={i.id}>
                  <input
                    type="checkbox"
                    checked={kit.done.includes(i.id)}
                    onChange={() => toggle(i.id)}
                  />
                  {i.label}
                </label>
              ))}
          </fieldset>
        ))}
      </section>
      <section className="carte-block" aria-label="Contacts utiles">
        <h3>Contacts utiles</h3>
        <ul className="carte-list">
          {contacts.map((c) => (
            <li key={c.n}>
              <a href={`tel:${c.n}`}>
                <Phone size={12} aria-hidden="true" /> <b>{c.n}</b>
              </a>{' '}
              {c.label}
            </li>
          ))}
        </ul>
        <h3>Autorités et informations officielles</h3>
        <ul className="carte-list">
          {authorities.map((a) => (
            <li key={a.url}>
              <a
                className="carte-link"
                href={a.url}
                target="_blank"
                rel="noreferrer"
              >
                {a.label} <ExternalLink size={12} aria-hidden="true" />
                <span className="sr-only"> (nouvel onglet)</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="carte-na">
          Points de rassemblement : non publiés en données ouvertes ; voir le
          DICRIM de votre commune.
        </p>
      </section>
    </div>
  );
}
