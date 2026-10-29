import { useEffect, useState } from 'react';
import {
  ChevronDown,
  LocateFixed,
  MessageSquare,
  Phone,
  PhoneCall,
  Share2,
  UserPlus,
} from 'lucide-react';
import { risks, type RiskId } from '../../app/v3/carte/risks.js';
import { useHome } from '../../app/v3/carte/Logement.js';
import { useSituation, at } from '../../app/v3/carte/Proches.js';
import { evacuate, noOrder, shelter, situations } from './crisis.js';

// « Je suis en danger » : conçu pour le stress (une action à la fois,
// gros boutons, phrases courtes, pictogramme + texte, contraste fort).
// Ordre : situation → que faire maintenant → appeler les secours →
// prévenir ses proches. Rien n'est simulé : appels et messages passent
// par le téléphone ; aucun envoi n'est annoncé comme réussi. Choix gardés
// en cas d'interruption.
const KEY = 'ds-v3-danger';
const PLAN = 'ds-v3-plan';
type Saved = { risk?: RiskId; open?: string };
const read = <T,>(k: string, d: T): T => {
  try {
    return JSON.parse(localStorage.getItem(k) ?? 'null') ?? d;
  } catch {
    return d;
  }
};
const DAY = 86_400_000;

export default function Danger() {
  const situation = useSituation();
  const home = useHome();
  const saved = read<Saved>(KEY, {});
  const [plan, setPlan] = useState<Record<string, string>>(() =>
    read(PLAN, {}),
  );
  const [manual, setManual] = useState<RiskId | undefined>(saved.risk);
  const [open, setOpen] = useState<string | undefined>(saved.open ?? 'now');
  const [picking, setPicking] = useState(false);
  const [adding, setAdding] = useState(false);
  const [share, setShare] = useState<string>();
  const [pos, setPos] = useState<{
    lat: number;
    lon: number;
    acc: number;
    at: string;
  }>();
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ risk: manual, open }));
    } catch {
      // Préférence facultative.
    }
  }, [manual, open]);
  // Dernier événement observé ou publié (pas une alerte) : cyclone actif à
  // moins de 800 km, message tsunami Caraïbe de moins de 24 h, séisme de
  // moins de 48 h. Sinon, choix manuel.
  const d = situation.data;
  const now = Date.now();
  const storm = d?.cyclones.ok
    ? d.cyclones.data.storms.find((s) => s.distanceKm < 800)
    : undefined;
  const wave = d?.tsunami.ok
    ? d.tsunami.data.messages.find((m) => now - Date.parse(m.updated) < DAY)
    : undefined;
  const quake = d?.seismes.ok
    ? d.seismes.data.events.find((e) => now - Date.parse(e.time) < 2 * DAY)
    : undefined;
  const auto: { id: RiskId; text: string } | undefined = storm
    ? {
        id: 'cyclone',
        text: `${storm.classification} ${storm.name} à ${storm.distanceKm} km (NHC, ${at(storm.updated)})`,
      }
    : wave
      ? {
          id: 'tsunami',
          text: `Message ${wave.center} pour la Caraïbe (${at(wave.updated)})`,
        }
      : quake
        ? {
            id: 'seisme',
            text: `Séisme M ${quake.mag.toFixed(1)} observé le ${at(quake.time)} (USGS)`,
          }
        : undefined;
  const id = manual ?? auto?.id;
  const r = risks.find((x) => x.id === id);
  const contact = plan.contactTel?.trim();
  const toggle = (k: string) => setOpen(open === k ? undefined : k);
  const message = () => {
    const p =
      pos ??
      (home && { lat: home.lat, lon: home.lon, acc: 0, at: home.savedAt });
    return p
      ? `J’ai besoin d’aide. Ma position : ${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}${p.acc ? ` (± ${p.acc} m)` : home ? ` — ${home.label}` : ''}, enregistrée le ${at(p.at)}.`
      : 'J’ai besoin d’aide. Position inconnue.';
  };
  const answer = (
    k: string,
    title: string,
    first: string,
    steps: string[],
    more?: string,
  ) => (
    <li key={k} className="d-q" data-open={open === k || undefined}>
      <button
        type="button"
        aria-expanded={open === k}
        aria-controls={`d-${k}`}
        onClick={() => toggle(k)}
      >
        {title} <ChevronDown size={18} aria-hidden="true" />
      </button>
      {open === k && (
        <div id={`d-${k}`} className="d-a">
          <p className="d-first">{first}</p>
          {steps.length > 0 && (
            <ol>
              {steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          )}
          {more && <small className="carte-stamp">{more}</small>}
        </div>
      )}
    </li>
  );
  return (
    <div className="danger">
      <div className="danger-body">
        <section className="d-risk" aria-label="Situation">
          {r ? (
            <button
              type="button"
              className="d-tag"
              aria-expanded={picking}
              onClick={() => setPicking(!picking)}
            >
              <r.icon size={20} aria-hidden="true" /> {r.label}{' '}
              <ChevronDown size={18} aria-hidden="true" />
            </button>
          ) : (
            <p className="d-first">Quelle est votre situation ?</p>
          )}
          <small className="carte-stamp">
            {manual
              ? 'Choisi par vous.'
              : auto
                ? `Dernier événement observé : ${auto.text}. Ce n’est pas une alerte officielle.`
                : situation.state === 'loading'
                  ? 'Recherche du dernier événement…'
                  : 'Aucun événement récent connu : choisissez.'}
          </small>
          {(picking || !r) && (
            <div
              className="d-picks"
              role="group"
              aria-label="Choisir la situation"
            >
              {risks.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  aria-pressed={id === x.id}
                  onClick={() => {
                    setManual(x.id);
                    setPicking(false);
                    setOpen('now');
                  }}
                >
                  <x.icon size={18} aria-hidden="true" /> {x.label}
                </button>
              ))}
            </div>
          )}
        </section>
        <a className="d-sos" href="tel:112">
          <PhoneCall size={24} aria-hidden="true" />
          <span>
            <b>Appeler les secours</b>
            <small>112 · urgence vitale</small>
          </span>
        </a>
        <p className="d-numbers">
          {[
            ['15', 'SAMU'],
            ['18', 'Pompiers'],
            ['17', 'Police'],
            ['114', 'SMS si vous ne pouvez pas parler'],
          ].map(([n, l]) => (
            <a key={n} href={n === '114' ? 'sms:114' : `tel:${n}`}>
              <b>{n}</b> {l}
            </a>
          ))}
        </p>
        {r && (
          <ul className="d-qs">
            {answer(
              'now',
              'Que faire maintenant ?',
              r.pendant[0],
              r.pendant.slice(1),
              `${r.apres.join(' ')} Source : ${r.official.org}.`,
            )}
            {answer('evac', 'Dois-je évacuer ?', evacuate[r.id], [], noOrder)}
            {answer(
              'abri',
              'Où me mettre à l’abri ?',
              shelter[r.id],
              [],
              'Abris et points de rassemblement officiels : non publiés en données ouvertes ; DICRIM de votre commune.',
            )}
            {answer(
              'proches',
              'Où retrouver mes proches ?',
              plan.ralliement?.trim()
                ? `Point de ralliement : ${plan.ralliement}.`
                : 'Aucun point de ralliement enregistré.',
              plan.rassemblement?.trim()
                ? [
                    `Point de rassemblement officiel noté : ${plan.rassemblement}.`,
                  ]
                : [],
              plan.partage?.trim()
                ? `Position des proches : via ${plan.partage} (service convenu, à ouvrir sur votre téléphone).`
                : 'Position des proches : non disponible, aucun service connecté. À préparer dans « Mon plan d’urgence ».',
            )}
            {answer(
              'ok',
              'Comment signaler que je vais bien ?',
              contact
                ? 'Envoyez « Je vais bien » à votre contact.'
                : 'Ajoutez un contact d’urgence (bouton en bas).',
              [],
              'Le message s’ouvre dans votre messagerie : vous l’envoyez vous-même.',
            )}
          </ul>
        )}
        {r && open === 'ok' && contact && (
          <a
            className="d-line"
            href={`sms:${contact.replace(/\s/g, '')}?&body=${encodeURIComponent('Je vais bien.')}`}
          >
            <MessageSquare size={18} aria-hidden="true" /> Écrire « Je vais bien
            » à {plan.contactNom || contact}
          </a>
        )}
        <section className="d-card" aria-label="Prévenir mes proches">
          <h2>Prévenir mes proches</h2>
          <p className="small">{message()}</p>
          <div className="d-row">
            <button
              type="button"
              className="d-line"
              onClick={() =>
                navigator.geolocation?.getCurrentPosition(
                  (p) =>
                    setPos({
                      lat: p.coords.latitude,
                      lon: p.coords.longitude,
                      acc: Math.round(p.coords.accuracy),
                      at: new Date().toISOString(),
                    }),
                  () =>
                    setShare(
                      'Position actuelle indisponible : l’adresse enregistrée sera utilisée.',
                    ),
                  { enableHighAccuracy: true, timeout: 10_000 },
                )
              }
            >
              <LocateFixed size={18} aria-hidden="true" /> Utiliser ma position
              actuelle
            </button>
            {'share' in navigator ? (
              <button
                type="button"
                className="d-line"
                onClick={() =>
                  navigator.share({ text: message() }).then(
                    () =>
                      setShare(
                        'Partage ouvert : l’envoi se confirme dans l’application choisie.',
                      ),
                    () => setShare('Non envoyé.'),
                  )
                }
              >
                <Share2 size={18} aria-hidden="true" /> Partager ma position
              </button>
            ) : null}
            <a
              className="d-line"
              href={`sms:${contact?.replace(/\s/g, '') ?? ''}?&body=${encodeURIComponent(message())}`}
              onClick={() =>
                setShare(
                  navigator.onLine
                    ? 'Message préparé dans votre messagerie : l’envoi se confirme là-bas.'
                    : 'Hors ligne : message prêt, non envoyé. Il partira quand vous l’enverrez avec du réseau.',
                )
              }
            >
              <MessageSquare size={18} aria-hidden="true" /> Par SMS
            </a>
          </div>
          {share && (
            <p className="carte-stamp" role="status">
              {share}
            </p>
          )}
        </section>
        <section className="d-card" aria-label="Situations particulières">
          <h2>Situations particulières</h2>
          <ul className="d-qs">
            {situations.map(([q, a]) => answer(`s-${q}`, q, a, []))}
          </ul>
        </section>
      </div>
      <div className="d-dock">
        {contact ? (
          <a className="d-contact" href={`tel:${contact.replace(/\s/g, '')}`}>
            <Phone size={20} aria-hidden="true" /> Appeler mon contact d’urgence
            <small>{plan.contactNom || contact}</small>
          </a>
        ) : adding ? (
          <form
            className="d-add"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const next = {
                ...plan,
                contactNom: String(f.get('nom') ?? ''),
                contactTel: String(f.get('tel') ?? ''),
              };
              localStorage.setItem(PLAN, JSON.stringify(next));
              setPlan(next);
              setAdding(false);
            }}
          >
            <input
              className="input"
              name="nom"
              aria-label="Nom du contact"
              placeholder="Nom"
            />
            <input
              className="input"
              name="tel"
              type="tel"
              required
              aria-label="Téléphone du contact"
              placeholder="Téléphone"
            />
            <button type="submit" className="d-contact">
              Enregistrer
            </button>
          </form>
        ) : (
          <button
            type="button"
            className="d-contact d-contact--add"
            onClick={() => setAdding(true)}
          >
            <UserPlus size={20} aria-hidden="true" /> Ajouter un contact
            d’urgence
          </button>
        )}
      </div>
    </div>
  );
}
