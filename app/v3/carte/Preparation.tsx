import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCheck,
  Download,
  House,
  Info,
  ListChecks,
  MapPin,
  Menu,
  Mountain,
  Radio,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Button, Card, Progress } from '../ui.js';
import { useSavedState } from '../localStore.js';
import Downloads, { cachedResources, resourcesChanged } from './Downloads.js';
import Logement, { useHome } from './Logement.js';
import Plan from './Plan.js';
import Preparer from './Preparer.js';
import { authorities, risks } from './risks.js';
import {
  complete,
  emptyGuide,
  emptyKit,
  guideKey,
  guideSteps,
  kitItems,
  kitKey,
  planKey,
  ready,
  signature,
  type GuideId,
  type PersonalPlan,
  type Preparation as PreparationData,
} from './preparationModel.js';

const emptyPlan: PersonalPlan = {};
const icons = [Download, House, Users, ListChecks, MapPin, Radio, CheckCheck];
const infos = [
  { id: 'contacts', title: 'Contacts d’urgence', icon: Users },
  { id: 'abris', title: 'Rassemblement & abris', icon: MapPin },
  { id: 'radio', title: 'Radio & fréquences', icon: Radio },
  { id: 'consignes', title: 'Consignes officielles', icon: BookOpen },
] as const;
type InfoId = (typeof infos)[number]['id'];
const criteria: Record<GuideId, string> = {
  offline:
    'Téléchargez les quatre ressources disponibles. Seule leur présence réelle dans le cache permet de valider.',
  foyer:
    'Vérifiez le nombre d’adultes et d’enfants ainsi que les besoins particuliers, puis validez votre foyer.',
  proches:
    'Renseignez un nom, un téléphone valide et votre point de ralliement convenu. Le partage de position reste facultatif et consenti.',
  trousse:
    'Cochez chaque élément réellement préparé. Les éléments non cochés restent à compléter.',
  exposition:
    'Renseignez votre adresse, les indications d’évacuation, le point de rassemblement et un lien officiel HTTPS en .gouv.fr. À défaut, passez cette étape : elle restera à compléter.',
  information:
    'Notez une radio et sa fréquence confirmées, puis le lien de la source officielle HTTPS en .gouv.fr. Aucune fréquence n’est proposée par défaut.',
  resume:
    'Les six étapes précédentes doivent être validées avant de terminer. Vous pouvez revenir compléter les manques.',
};

// Un seul formulaire à la fois. Les clés historiques restent inchangées ;
// le suivi est séparé et ne contient que navigation et validations.
export default function Preparation() {
  const [guide, setGuide, guideError] = useSavedState(guideKey, emptyGuide);
  const [plan, setPlan, planError] = useSavedState(planKey, emptyPlan);
  const [kit, , kitError] = useSavedState(kitKey, emptyKit);
  const home = useHome();
  const [cached, setCached] = useState<string[]>([]);
  const [cacheError, setCacheError] = useState('');
  const [info, setInfo] = useState<InfoId | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [message, setMessage] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const [hasNavigated, setHasNavigated] = useState(false);
  useEffect(() => {
    let live = true;
    const sync = () =>
      void cachedResources().then(
        (ids) => {
          if (live) {
            setCached(ids);
            setCacheError('');
          }
        },
        () => {
          if (live) {
            setCached([]);
            setCacheError(
              'Cache inaccessible : ressources hors ligne non confirmées.',
            );
          }
        },
      );
    sync();
    addEventListener(resourcesChanged, sync);
    addEventListener('focus', sync);
    return () => {
      live = false;
      removeEventListener(resourcesChanged, sync);
      removeEventListener('focus', sync);
    };
  }, []);
  useEffect(() => {
    if (hasNavigated) heading.current?.focus();
  }, [guide.active, guide.started, info, hasNavigated]);
  const data: PreparationData = {
    plan,
    kit,
    home: home ? { label: home.label, lat: home.lat, lon: home.lon } : null,
    cached,
  };
  const index = Math.max(
    0,
    guideSteps.findIndex((s) => s.id === guide.active),
  );
  const step = guideSteps[index];
  const done = guideSteps.filter((s) => complete(s.id, guide, data)).length;
  const exists =
    guide.started ||
    Object.keys(plan).length > 0 ||
    kit.done.length > 0 ||
    !!home ||
    cached.length > 0;
  const go = (id: GuideId) => {
    setGuide((g) => ({ ...g, started: true, active: id }));
    setInfo(null);
    setNavOpen(false);
    setMessage('');
    setHasNavigated(true);
  };
  const field = (id: string, label: string, type = 'text') => (
    <label className="plan-field">
      <span>{label}</span>
      <input
        className="input"
        type={type}
        maxLength={2000}
        value={plan[id] ?? ''}
        onChange={(e) => setPlan((p) => ({ ...p, [id]: e.target.value }))}
      />
    </label>
  );
  const valid = ready(step.id, data) && (step.id !== 'resume' || done >= 6);
  function validate() {
    if (!valid) return setMessage(criteria[step.id]);
    setGuide((g) => ({
      ...g,
      validated: { ...g.validated, [step.id]: signature(step.id, data) },
      skipped: g.skipped.filter((id) => id !== step.id),
    }));
    if (index < 6) go(guideSteps[index + 1].id);
    else
      setMessage(
        'Votre plan est complété. Vous pouvez le modifier à tout moment. Aucune donnée n’a été partagée.',
      );
  }
  const notice = guideError || planError || kitError || cacheError;
  const progress = (
    <>
      <p className="prep-eyebrow">Votre préparation</p>
      <strong className="prep-percent">
        {Math.round((done / 7) * 100)}
        <small> %</small>
      </strong>
      <Progress
        value={(done / 7) * 100}
        label="Progression du plan d’urgence"
      />
      <p role="status">
        {done}/7 terminées · {7 - done} restantes
      </p>
      <p className="muted small">
        Seules les étapes validées et toujours à jour comptent. Une modification
        peut les remettre à compléter.
      </p>
      <ul className="prep-benefits">
        <li>Un foyer préparé</li>
        <li>Des proches à prévenir</li>
        <li>Des informations accessibles</li>
      </ul>
      <p className="carte-stamp">
        Données sur cet appareil uniquement. Les informations saisies ne sont
        pas vérifiées automatiquement auprès des autorités.
      </p>
    </>
  );
  if (!guide.started)
    return (
      <section
        className="prep-welcome"
        aria-label="Commencer mon plan d’urgence"
      >
        <div className="prep-art" aria-hidden="true">
          <Mountain size={104} strokeWidth={1} />
          <ShieldCheck size={40} />
        </div>
        <div>
          <p className="prep-eyebrow">Anticiper, à votre rythme</p>
          <h2>Commencer à paramétrer mon plan d’urgence</h2>
          <p>
            Protéger vos proches et retrouver vos informations, même quand le
            réseau est dégradé. Sept étapes courtes, modifiables à tout moment.
          </p>
          <p className="muted small">
            Vos données existantes sont conservées. Aucun compte, aucun partage
            automatique.
          </p>
          {notice && (
            <p role="alert" className="alert-text">
              {notice}
            </p>
          )}
          <Button onClick={() => go(guide.active)}>
            {exists ? 'Reprendre mon plan' : 'Commencer'}{' '}
            <ArrowRight size={16} aria-hidden="true" />
          </Button>
        </div>
      </section>
    );
  return (
    <div className="preparation">
      <Button
        className="prep-menu-toggle"
        variant="outline"
        aria-expanded={navOpen}
        aria-controls="prep-navigation"
        onClick={() => setNavOpen(!navOpen)}
      >
        <Menu size={16} aria-hidden="true" /> Mon plan · {done}/7 terminées
      </Button>
      <nav
        className="prep-navigation"
        id="prep-navigation"
        data-open={navOpen || undefined}
        aria-label="Mon plan"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setNavOpen(false);
            document
              .querySelector<HTMLButtonElement>('.prep-menu-toggle')
              ?.focus();
          }
        }}
      >
        <h2>Mon plan</h2>
        <ol>
          {guideSteps.map((s, i) => {
            const Icon = icons[i];
            const status = complete(s.id, guide, data)
              ? 'Terminé'
              : guide.skipped.includes(s.id) || guide.validated[s.id]
                ? 'À compléter'
                : s.id === step.id
                  ? 'En cours'
                  : 'À faire';
            return (
              <li key={s.id}>
                <button
                  type="button"
                  aria-current={!info && s.id === step.id ? 'step' : undefined}
                  onClick={() => go(s.id)}
                >
                  <span className="prep-number">
                    {status === 'Terminé' ? (
                      <Check size={15} aria-hidden="true" />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <span>
                    <b>{s.title}</b>
                    <small>{status}</small>
                  </span>
                  <Icon size={16} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ol>
        <h3>Informations utiles</h3>
        {infos.map((f) => (
          <button
            type="button"
            key={f.id}
            className="prep-info-link"
            aria-pressed={info === f.id}
            onClick={() => {
              setInfo(f.id);
              setNavOpen(false);
              setHasNavigated(true);
            }}
          >
            <f.icon size={16} aria-hidden="true" />
            {f.title}
          </button>
        ))}
      </nav>
      <Card className="prep-task">
        {notice && (
          <p role="alert" className="alert-text">
            {notice}
          </p>
        )}
        <header className="prep-task-head">
          <p className="prep-eyebrow">
            {info ? 'Informations utiles' : `Étape ${index + 1} sur 7`}
          </p>
          <h2 ref={heading} tabIndex={-1}>
            {info ? infos.find((f) => f.id === info)!.title : step.title}
          </h2>
          {!info && <p>{step.help}</p>}
        </header>
        {info ? (
          <>
            {info === 'contacts' && <Preparer part="infos" />}
            {info === 'abris' && (
              <>
                <p className="carte-na">
                  Aucun point de rassemblement ni abri sûr n’est confirmé dans
                  l’application. Consultez le DICRIM de votre mairie et les
                  consignes de la préfecture.
                </p>
                <OfficialLinks />
              </>
            )}
            {info === 'radio' && (
              <>
                <p className="carte-na">
                  Aucune fréquence vérifiée n’est intégrée. Notez uniquement les
                  informations confirmées par la préfecture ; aucune station
                  n’est inventée ici.
                </p>
                <OfficialLinks />
              </>
            )}
            {info === 'consignes' &&
              risks.map((r) => (
                <details key={r.id} className="prep-risk">
                  <summary>
                    <r.icon size={16} aria-hidden="true" />
                    {r.label}
                  </summary>
                  <p>{r.causes}</p>
                  {[
                    ['Avant', r.avant],
                    ['Pendant', r.pendant],
                    ['Après', r.apres],
                  ].map(([title, list]) => (
                    <section key={title as string}>
                      <h3>{title}</h3>
                      <ul>
                        {(list as string[]).map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    </section>
                  ))}
                  <a
                    className="carte-link"
                    href={r.official.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Source : {r.official.org} (nouvel onglet)
                  </a>
                </details>
              ))}
            <Button
              variant="outline"
              onClick={() => {
                setInfo(null);
                setHasNavigated(true);
              }}
            >
              Revenir à mon étape
            </Button>
          </>
        ) : (
          <>
            <aside className="prep-why">
              <Info size={18} aria-hidden="true" />
              <div>
                <b>Pourquoi c’est important ?</b>
                <p>{step.why}</p>
              </div>
            </aside>
            <div className="prep-fields">
              {step.id === 'offline' && (
                <section aria-label="Télécharger mes ressources d’urgence">
                  <Downloads />
                </section>
              )}
              {step.id === 'foyer' && <Preparer part="foyer" />}
              {step.id === 'proches' && (
                <Plan sections={['vie', 'proches', 'rassemblement']} />
              )}
              {step.id === 'trousse' && (
                <>
                  <Preparer part="trousse" />
                  <Plan sections={['nourriture']} />
                </>
              )}
              {step.id === 'exposition' && (
                <>
                  <Logement home={home} />
                  <Plan sections={['evacuation', 'rassemblement']} />
                  {field(
                    'evacuationSource',
                    'Lien de la source officielle de mon secteur (.gouv.fr)',
                    'url',
                  )}
                  <p className="carte-na">
                    Les indications ci-dessus sont vos notes, à vérifier auprès
                    de votre mairie. Aucun zonage, itinéraire ou lieu sûr n’est
                    déduit de la carte.
                  </p>
                  <OfficialLinks />
                </>
              )}
              {step.id === 'information' && (
                <>
                  <Plan sections={['pc', 'risques']} />
                  {field(
                    'infoSource',
                    'Lien officiel confirmant ma radio / fréquence (.gouv.fr)',
                    'url',
                  )}
                  <OfficialLinks />
                </>
              )}
              {step.id === 'resume' && (
                <>
                  <dl className="prep-summary">
                    <div>
                      <dt>Mon foyer</dt>
                      <dd>
                        {kit.adults} adulte(s), {kit.children} enfant(s)
                        {kit.needs.length
                          ? ` · besoins : ${kit.needs.join(', ')}`
                          : ''}
                      </dd>
                    </div>
                    <div>
                      <dt>Contact</dt>
                      <dd>
                        {plan.contactNom || 'À compléter'} ·{' '}
                        {plan.contactTel || 'À compléter'}
                      </dd>
                    </div>
                    <div>
                      <dt>Ralliement convenu</dt>
                      <dd>{plan.ralliement || 'À compléter'}</dd>
                    </div>
                    <div>
                      <dt>Adresse</dt>
                      <dd>{home?.label || 'À compléter'}</dd>
                    </div>
                    <div>
                      <dt>Trousse</dt>
                      <dd>
                        {
                          kitItems(kit).filter((k) => kit.done.includes(k.id))
                            .length
                        }
                        /{kitItems(kit).length} éléments prêts
                      </dd>
                    </div>
                    <div>
                      <dt>Radio / fréquence notée</dt>
                      <dd>{plan.radio || 'Non confirmée'}</dd>
                    </div>
                  </dl>
                  <ul className="prep-review">
                    {guideSteps.slice(0, 6).map((s) => (
                      <li key={s.id}>
                        <span>
                          {s.title} ·{' '}
                          {complete(s.id, guide, data)
                            ? 'Terminé'
                            : 'À compléter'}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => go(s.id)}
                        >
                          Modifier<span className="sr-only"> {s.title}</span>
                        </Button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <p className="prep-criteria" id="prep-criteria">
              {criteria[step.id]}
            </p>
            {message && (
              <p role="status" className="prep-message">
                {message}
              </p>
            )}
            <footer className="prep-actions">
              <Button
                variant="outline"
                disabled={index === 0}
                onClick={() => go(guideSteps[index - 1].id)}
              >
                <ArrowLeft size={16} aria-hidden="true" />
                Précédent
              </Button>
              {index < 6 && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setGuide((g) => ({
                      ...g,
                      validated: { ...g.validated, [step.id]: undefined },
                      skipped: [...new Set([...g.skipped, step.id])],
                    }));
                    go(guideSteps[index + 1].id);
                  }}
                >
                  Passer pour l’instant
                </Button>
              )}
              <Button aria-describedby="prep-criteria" onClick={validate}>
                {index === 6 ? 'Terminer mon plan' : 'Valider et continuer'}
                {index < 6 && <ArrowRight size={16} aria-hidden="true" />}
              </Button>
            </footer>
          </>
        )}
      </Card>
      <aside className="prep-progress" aria-label="Progression de mon plan">
        {progress}
      </aside>
    </div>
  );
}

function OfficialLinks() {
  return (
    <ul className="carte-list">
      {authorities.map((a) => (
        <li key={a.url}>
          <a
            className="carte-link"
            href={a.url}
            target="_blank"
            rel="noreferrer"
          >
            {a.label} (nouvel onglet)
          </a>
        </li>
      ))}
    </ul>
  );
}
