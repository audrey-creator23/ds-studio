import { useState, type CSSProperties, type ReactNode } from 'react';
import { tokenCss, type Tokens } from '../shared/model.js';
import {
  componentSpecs,
  type ComponentConfig,
  type ComponentSize,
  type ComponentState,
} from './design/componentSpecs.js';

export function DSProvider({
  tokens,
  children,
}: {
  tokens: Tokens;
  children: ReactNode;
}) {
  return (
    <div className="ds" style={tokenCss(tokens) as CSSProperties}>
      {children}
    </div>
  );
}
// `state` force un état (survol, focus) pour la planche de l'éditeur Design.
export function Button({
  variant = 'primary',
  size = 'md',
  state = 'default',
  children,
  disabled = false,
  onClick,
}: {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: ComponentSize;
  state?: ComponentState;
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className={`ds-button ${variant} ${size} is-${state}`}
      disabled={disabled || state === 'disabled'}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
export function Badge({
  variant = 'neutral',
  children,
}: {
  variant?: string;
  children: ReactNode;
}) {
  return <span className={`ds-badge ${variant}`}>{children}</span>;
}
export function Field({
  label,
  type = 'text',
  state = 'default',
}: {
  label: string;
  type?: string;
  state?: ComponentState;
}) {
  return (
    <label className="ds-field">
      {label}
      <input
        type={type}
        placeholder={type === 'email' ? 'camille@example.com' : 'Camille'}
        className={`is-${state}`}
        disabled={state === 'disabled'}
        aria-invalid={state === 'error' || undefined}
      />
      {state === 'error' && (
        <small className="ds-error">Ce champ est obligatoire.</small>
      )}
    </label>
  );
}
export function BookingCard({
  variant = 'standard',
  state = 'default',
}: {
  variant?: string;
  state?: ComponentState;
}) {
  const [booked, setBooked] = useState(false);
  return (
    <article className={`ds-card ${variant} is-${state}`}>
      <div className="card-kicker">ATELIER · 45 MIN</div>
      <h3>Faire moins, mais mieux.</h3>
      <p>Un atelier pour imaginer des services plus attentifs au quotidien.</p>
      <div className="card-meta">
        <Badge>6 places disponibles</Badge>
        <span>Gratuit</span>
      </div>
      <Button onClick={() => setBooked(!booked)}>
        {booked ? 'Réservation confirmée ✓' : 'Réserver une place'}
      </Button>
      <span role="status" className="ds-feedback">
        {booked ? 'Inscription de démonstration, aucune donnée envoyée.' : ''}
      </span>
    </article>
  );
}
export function ExampleForm() {
  const [sent, setSent] = useState(false);
  return (
    <form
      className="ds-form"
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
    >
      <label>
        Votre prénom
        <input placeholder="Camille" required onChange={() => setSent(false)} />
      </label>
      <label>
        Adresse e-mail
        <input
          type="email"
          placeholder="camille@example.com"
          required
          onChange={() => setSent(false)}
        />
      </label>
      <label>
        Champ désactivé
        <input placeholder="Non disponible" disabled />
      </label>
      <label className="ds-check">
        <input type="checkbox" required /> J’accepte les conditions de
        démonstration
      </label>
      <button className="ds-button primary" type="submit">
        S’inscrire
      </button>
      <p role="status">
        {sent ? 'Merci ! Démonstration locale, aucune inscription réelle.' : ''}
      </p>
    </form>
  );
}
export function Navigation({ initial = 'Découvrir' }: { initial?: string }) {
  const [tab, setTab] = useState(initial);
  return (
    <nav aria-label="Navigation du scénario" className="ds-nav">
      {['Découvrir', 'Favoris', 'Profil'].map((t) => (
        <button
          key={t}
          aria-current={tab === t ? 'page' : undefined}
          onClick={() => setTab(t)}
        >
          {t}
        </button>
      ))}
      <p className="nav-context" aria-live="polite">
        {tab === 'Favoris'
          ? 'Vos ateliers favoris apparaîtront ici.'
          : tab === 'Profil'
            ? 'Votre espace personnel de démonstration.'
            : 'Des idées à explorer près de chez vous.'}
      </p>
    </nav>
  );
}
export function Scenario({
  tokens,
  scenario,
}: {
  tokens: Tokens;
  scenario: string;
}) {
  return (
    <DSProvider tokens={tokens}>
      <div className="scenario">
        <header className="scenario-head">
          <strong>
            lisière<span>®</span>
          </strong>
          <Badge>Bordeaux</Badge>
        </header>
        <Navigation />
        <main>
          <div className="section-label">LE QUOTIDIEN, AUTREMENT</div>
          <h1>
            De petites idées.
            <br />
            De vrais liens.
          </h1>
          <p>Des ateliers pour apprendre, partager et se rencontrer.</p>
          {scenario === 'form' ? (
            <div className="ds-card">
              <h2>Rejoignez le mouvement.</h2>
              <ExampleForm />
            </div>
          ) : (
            <div className="scenario-grid">
              <BookingCard />
              <article className="ds-card">
                <div className="card-kicker">À VOTRE RYTHME</div>
                <h3>Un quartier qui inspire.</h3>
                <p>Explorez vos prochaines rencontres.</p>
                <Button variant="secondary">Voir les ateliers</Button>
              </article>
            </div>
          )}
        </main>
        <footer>lisière · Design System d’exemple fictif</footer>
      </div>
    </DSProvider>
  );
}

// Planche de l'éditeur Design : le composant configuré, dans chacun de ses états.
export function ComponentSheet({
  tokens,
  config,
}: {
  tokens: Tokens;
  config: ComponentConfig;
}) {
  const spec = componentSpecs[config.component];
  const render = (state: ComponentState) => {
    switch (config.component) {
      case 'button':
        return (
          <Button
            variant={config.variant as 'primary'}
            size={config.size}
            state={state}
          >
            {config.text || 'Bouton'}
          </Button>
        );
      case 'field':
        return (
          <Field
            label={config.text || 'Libellé'}
            type={config.variant}
            state={state}
          />
        );
      case 'badge':
        return <Badge variant={config.variant}>{config.text || 'Badge'}</Badge>;
      case 'card':
        return <BookingCard variant={config.variant} state={state} />;
      case 'navigation':
        return <Navigation key={config.variant} initial={config.variant} />;
    }
  };
  return (
    <DSProvider tokens={tokens}>
      <div className="ds-sheet">
        <div className="section-label">{spec.label.toUpperCase()}</div>
        <h1>{spec.label}</h1>
        <div className="ds-sheet-grid">
          {spec.states.map(([state, label]) => (
            <figure key={state}>
              {render(state)}
              <figcaption>{label}</figcaption>
            </figure>
          ))}
        </div>
        <p className="ds-caption">
          Composant réel du projet, tokens du brouillon. Testez au clavier et à
          la souris.
        </p>
      </div>
    </DSProvider>
  );
}
