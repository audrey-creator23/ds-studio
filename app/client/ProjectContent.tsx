// Synthèse du brief PFE consulté sur Notion (lecture seule), sans donnée privée.
// Mettre à jour ce fichier à la main si le brief évolue.
const source =
  'https://app.notion.com/p/PFE-M2UXUI-2026-27-2989c8cd131380fb85e5f3b42fe6d1f8';

const planning = [
  ['25 sept.', 'Présentation du PFE · recherche de sujets'],
  [
    '13 nov.',
    'Livrable : note de cadrage · validation des projets · atelier cadrage',
  ],
  [
    '11 déc.',
    'Points accessibilité & RGPD · atelier cadrage · suivi individuel',
  ],
  ['8 janv. → 12 mars', 'Cours Design System'],
  [
    '29 janv.',
    'Livrable : document de cadrage · cours DS structure & méthode · atelier',
  ],
];

const sections: { title: string; items: string[] }[] = [
  {
    title: 'Cadrage',
    items: [
      'Intention : note d’intention, problématique, objectifs.',
      'Contexte : secteur, existant (si refonte), cibles utilisateurs.',
      'Fonctionnel : fonctionnalités, plan du site ou de l’app, filtres et tri, user flows.',
      'Technique : accessibilité et SEO, RGPD, compatibilité navigateurs ou OS.',
      'Spécifications graphiques, charte et maquettes : livrées avec le Design System.',
    ],
  },
  {
    title: 'Design System',
    items: [
      'Charte graphique : typographies, couleurs, icônes, pictos.',
      'Primitives et tokens (sémantiques et/ou composants).',
      'Layouts de l’UI : spécifications par type d’écran et plateforme.',
      'Composants fonctionnels : boutons, formulaires, blocs médias…',
      'Évalué sur C3.4 (cohérence, évolutivité, multi-supports) et C3.5 (bibliothèque complète) ; intègre C3.2 (specs UI) et C3.3 (exigences techniques).',
    ],
  },
  {
    title: 'Tests utilisateurs',
    items: [
      'Tester ce qui est risqué, critique, incertain ou déterminant, pas tout.',
      'Prioriser : moments clés, éléments innovants, zones d’erreur, effort cognitif, frictions supposées, impact projet.',
      'Noter 4 critères de 1 à 5 (importance, incertitude, risque, impact) : 16–20 P1, 11–15 P2, 6–10 P3, 1–5 P4.',
    ],
  },
];

export default function ProjectContent() {
  return (
    <section className="project-content" aria-labelledby="projet-title">
      <h2 id="projet-title" tabIndex={-1}>
        Brief du projet · PFE M2 UX/UI 2026-27
      </h2>
      <div className="project-grid">
        <article>
          <h3>Sujet</h3>
          <p>
            Choisir un secteur et un type de service numérique, puis concevoir
            un service innovant qui répond à un problème précis.
          </p>
          <h3>Objectif</h3>
          <p>
            Montrer la maîtrise des méthodes UX et UI, des contraintes
            techniques et de l’adaptation mobile, web et tablette. Évaluation :
            organiser, concevoir, prototyper, valider et communiquer clairement.
          </p>
        </article>
        <article>
          <h3>Planning</h3>
          <ol className="project-planning">
            {planning.map(([date, label]) => (
              <li key={date}>
                <strong>{date}</strong>
                <span>{label}</span>
              </li>
            ))}
          </ol>
        </article>
        {sections.map((s) => (
          <article key={s.title}>
            <h3>{s.title}</h3>
            <ul>
              {s.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <p className="project-source">
        Synthèse du brief Notion, consulté sans modification.{' '}
        <a href={source} target="_blank" rel="noreferrer">
          Ouvrir la source
        </a>
      </p>
    </section>
  );
}
