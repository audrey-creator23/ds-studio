import { useEffect, useState } from 'react';
import { Bell, Copy, ExternalLink, Play } from 'lucide-react';
import { risks } from '../../app/v3/carte/risks.js';

// Notifications et raccourcis : seulement ce que le navigateur permet
// réellement. Pas de service push (aucun serveur de notifications) : une
// notification ne peut s'afficher que l'application ouverte ; jamais une
// alerte vitale ni un remplacement de FR-Alert.
const PREFS = 'ds-v3-notifs';
const LOG = 'ds-v3-notifs-log';
const read = <T,>(k: string, d: T): T => {
  try {
    return JSON.parse(localStorage.getItem(k) ?? 'null') ?? d;
  } catch {
    return d;
  }
};
const save = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    // Stockage indisponible : réglage gardé pour la session.
  }
};
type Prefs = { risks: string[]; level: string; zone: string; reminder: string };

export function Notifications() {
  const supported = typeof Notification !== 'undefined';
  const [perm, setPerm] = useState(
    supported ? Notification.permission : 'denied',
  );
  const [prefs, setPrefs] = useState<Prefs>(() =>
    read(PREFS, {
      risks: risks.map((r) => r.id),
      level: 'orange',
      zone: 'logement',
      reminder: 'off',
    }),
  );
  const [log, setLog] = useState<{ at: string; text: string }[]>(() =>
    read(LOG, []),
  );
  useEffect(() => save(PREFS, prefs), [prefs]);
  const test = () => {
    const text = 'Notification de test : ce n’est pas une alerte.';
    new Notification('Risques Martinique', { body: text });
    const next = [{ at: new Date().toISOString(), text }, ...log].slice(0, 20);
    setLog(next);
    save(LOG, next);
  };
  return (
    <div className="m-scroll">
      <p className="carte-explain">
        Les alertes officielles arrivent par FR-Alert sur votre téléphone :
        gardez-les activées. Cette application ne les remplace pas.
      </p>
      <section className="d-card" aria-label="Autorisation">
        <h2>Autorisation</h2>
        {!supported ? (
          <p className="carte-na">
            Notifications non prises en charge par ce navigateur.
          </p>
        ) : perm === 'granted' ? (
          <p>Autorisées sur cet appareil.</p>
        ) : perm === 'denied' ? (
          <p className="carte-na">
            Refusées : modifiable dans les réglages du navigateur.
          </p>
        ) : (
          <button
            type="button"
            className="d-line"
            onClick={() => void Notification.requestPermission().then(setPerm)}
          >
            <Bell size={18} aria-hidden="true" /> Autoriser les notifications
          </button>
        )}
        <small className="carte-stamp">
          Limite : pas de service push. Une notification ne s’affiche que
          l’application ouverte ; aucune alerte n’est garantie.
        </small>
        {perm === 'granted' && (
          <button type="button" className="d-line" onClick={test}>
            <Play size={18} aria-hidden="true" /> Envoyer une notification de
            test
          </button>
        )}
      </section>
      <section className="d-card" aria-label="Préférences">
        <h2>Préférences</h2>
        <fieldset className="carte-needs">
          <legend className="small">
            Alertes officielles par risque (quand le flux sera connecté)
          </legend>
          {risks.map((r) => (
            <label key={r.id} className="chip-check">
              <input
                type="checkbox"
                checked={prefs.risks.includes(r.id)}
                onChange={() =>
                  setPrefs((p) => ({
                    ...p,
                    risks: p.risks.includes(r.id)
                      ? p.risks.filter((x) => x !== r.id)
                      : [...p.risks, r.id],
                  }))
                }
              />
              {r.label}
            </label>
          ))}
        </fieldset>
        <label className="plan-field">
          <span>À partir du niveau</span>
          <select
            className="input input-sm"
            value={prefs.level}
            onChange={(e) => setPrefs({ ...prefs, level: e.target.value })}
          >
            <option value="jaune">Jaune</option>
            <option value="orange">Orange</option>
            <option value="rouge">Rouge</option>
          </select>
        </label>
        <label className="plan-field">
          <span>Zone</span>
          <select
            className="input input-sm"
            value={prefs.zone}
            onChange={(e) => setPrefs({ ...prefs, zone: e.target.value })}
          >
            <option value="logement">Mon logement</option>
            <option value="ile">Toute la Martinique</option>
          </select>
        </label>
        <label className="plan-field">
          <span>Rappel de préparation (affiché à l’ouverture)</span>
          <select
            className="input input-sm"
            value={prefs.reminder}
            onChange={(e) => setPrefs({ ...prefs, reminder: e.target.value })}
          >
            <option value="off">Désactivé</option>
            <option value="mensuel">Chaque mois</option>
            <option value="trimestriel">Chaque trimestre</option>
          </select>
        </label>
        <p className="carte-na">
          Proches : non disponible, aucun service de partage connecté. Vigilance
          officielle : flux non connecté, aucune alerte ne sera envoyée tant
          qu’il ne l’est pas.
        </p>
      </section>
      <section className="d-card" aria-label="Historique">
        <h2>Historique</h2>
        {log.length ? (
          <ul className="carte-list">
            {log.map((l) => (
              <li key={l.at}>
                {new Date(l.at).toLocaleString('fr-FR', {
                  timeZone: 'America/Martinique',
                })}{' '}
                · {l.text}
              </li>
            ))}
          </ul>
        ) : (
          <p className="carte-na">Aucune notification affichée.</p>
        )}
      </section>
    </div>
  );
}

// Raccourcis : liens directs vers l'application, testables ici ; à
// placer sur l'écran d'accueil, dans Raccourcis (iOS) ou sur le bouton
// Action, selon le téléphone. Une page web ne peut pas intercepter le
// bouton d'alimentation, ni remplacer l'appel d'urgence (SOS) natif.
const shortcuts = [
  { hash: 'danger', label: 'Je suis en danger' },
  { hash: 'explore', label: 'Ouvrir la carte' },
  { hash: 'offline', label: 'Ressources hors ligne' },
  { hash: 'plan', label: 'Mon plan d’urgence' },
];
export function Shortcuts({ onTest }: { onTest: (hash: string) => void }) {
  const [copied, setCopied] = useState<string>();
  const url = (h: string) => `${location.origin}/pfe/#${h}`;
  return (
    <div className="m-scroll">
      <section className="d-card" aria-label="Raccourcis de l’application">
        <h2>Raccourcis de l’application</h2>
        <ul className="m-shortcuts">
          {shortcuts.map((s) => (
            <li key={s.hash}>
              <b>{s.label}</b>
              <code>{url(s.hash)}</code>
              <span className="d-row">
                <button
                  type="button"
                  className="d-line"
                  onClick={() => onTest(s.hash)}
                >
                  <Play size={16} aria-hidden="true" /> Tester
                </button>
                <button
                  type="button"
                  className="d-line"
                  onClick={() =>
                    navigator.clipboard?.writeText(url(s.hash)).then(
                      () => setCopied(s.hash),
                      () => setCopied(undefined),
                    )
                  }
                >
                  <Copy size={16} aria-hidden="true" />{' '}
                  {copied === s.hash ? 'Copié' : 'Copier le lien'}
                </button>
              </span>
            </li>
          ))}
        </ul>
        <small className="carte-stamp">
          Appeler les secours ou votre contact : bouton de l’écran « Je suis en
          danger » (l’appel demande toujours votre geste).
        </small>
      </section>
      <section className="d-card" aria-label="Sur iPhone">
        <h2>Sur iPhone</h2>
        <ol className="carte-list">
          <li>
            Safari : Partager → « Sur l’écran d’accueil » (icône vers
            l’application).
          </li>
          <li>
            App Raccourcis : action « Ouvrir les URL » avec un lien ci-dessus.
          </li>
          <li>
            Ce raccourci peut être lancé par Siri, par « Toucher le dos »
            (Réglages → Accessibilité → Toucher) ou par le bouton Action des
            modèles qui en ont un.
          </li>
        </ol>
      </section>
      <section className="d-card" aria-label="Sur Android">
        <h2>Sur Android</h2>
        <ol className="carte-list">
          <li>Chrome : menu ⋮ → « Ajouter à l’écran d’accueil ».</li>
          <li>
            Widget « Raccourci » ou favori du navigateur vers un lien ci-dessus.
          </li>
        </ol>
      </section>
      <section className="d-card" aria-label="Bouton d’alimentation">
        <h2>Double appui sur le bouton d’alimentation</h2>
        <p className="small">
          Impossible depuis une application web : le système réserve ce bouton
          (appareil photo, paiement, SOS d’urgence natif). Gardez le SOS natif
          activé ; utilisez plutôt un raccourci ci-dessus.
        </p>
        <a
          className="carte-link"
          href="https://support.apple.com/fr-fr/104992"
          target="_blank"
          rel="noreferrer"
        >
          SOS d’urgence sur iPhone (Apple){' '}
          <ExternalLink size={12} aria-hidden="true" />
        </a>
      </section>
    </div>
  );
}
