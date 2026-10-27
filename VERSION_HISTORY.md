# Historique des versions

Une entrée par modification de code validée, la plus récente en premier.
Numérotation [SemVer](https://semver.org/lang/fr/) : **patch** pour un correctif,
**minor** pour une fonctionnalité compatible, **major** pour un changement incompatible
(schéma de tokens, API, format de données). La version suit `package.json`.

## 2.15.0 — 2026-10-27

- **Type** : minor (dépendances `@mantine/core` et `@mantine/hooks` 9.6.3 ;
  champ facultatif `page` sur `/api/assistant` ; six nouveaux blocs de
  composition ; tokens Lisière, historique et données existantes inchangés)
- **Fichiers** : `package.json`, `package-lock.json`, `vite.config.ts`,
  `app/client/theme.ts`, `app/client/ui.tsx`, `app/client/main.tsx`,
  `app/client/Card.tsx`, `app/client/Sidebar.tsx`, `app/client/App.tsx`,
  `app/client/HomePage.tsx`, `app/client/ProjectBrief.tsx`,
  `app/client/ProjectContent.tsx`, `app/client/VolcanoDashboard.tsx`,
  `app/client/Volcano.tsx`, `app/client/VolcanoGL.tsx`,
  `app/client/AssistantPage.tsx`, `app/client/ChatConversation.tsx`,
  `app/client/ChatBubble.tsx`, `app/client/useAssistantChat.tsx`,
  `app/client/design/*` (ComposeWorkspace, ComposeChat, CompositionView,
  MantineBlocks, Simulator, TokenEditor), `app/client/styles.css`,
  `app/shared/composition.ts`, `app/server/http.ts`, `tests/theme.test.ts`,
  `tests/assistant.test.ts`, `tests/e2e/studio.spec.ts`
- **Résumé** : Mantine UI intégré avec un thème unique (`theme.ts`) : palette
  Sunflower Gold → Rich Mahogany déclinée en échelles de 10 teintes, rôles
  primary (Pure Red assombri, 5,5:1), accent (Atomic Tangerine), warning
  (Sunflower Gold), danger (Tomato), surfaces chaudes ; contrastes WCAG
  vérifiés par test. Variables `--ui-*` générées par le thème (plus de
  doublons dans le CSS). Migration ciblée : cartes (Card), boutons
  principaux (Button), barre latérale (NavLink, désormais rétractable et
  mémorisée), onglets Bibliothèque/Structure (Tabs), progression (Progress),
  statuts (Badge), rendu Volcan (SegmentedControl). Composants Mantine
  personnalisés exposés dans la bibliothèque Design (Bouton, Badge, Alerte,
  Progression, Champ, Onglets). Volcan réaliste en WebGL (shader écrit pour
  le projet, sans dépendance) : relief éclairé, lave qui s’écoule, fumée,
  braises et fontaine selon les dates du projet ; 30 i/s max, résolution
  réduite, pause hors écran ; image fixe si `prefers-reduced-motion` ; version
  légère SVG au choix ou si WebGL manque. Bulle Claude flottante sur toutes
  les pages : panneau compact non modal, même historique que la page
  Assistant, page affichée transmise à Claude (non enregistrée), déplaçable
  à la souris, au doigt et aux flèches, position mémorisée et bornée à
  l’écran, fermeture par Échap ou ✕. Clé API toujours côté serveur.

## 2.14.0 — 2026-10-27

- **Type** : minor (nouvelles routes locales `/api/compositions`,
  `/api/compositions/delete`, `/api/compose` ; nouveau fichier privé
  `.ds-studio/compositions.json` ; tokens et données existantes inchangés)
- **Fichiers** : `app/shared/composition.ts`, `app/server/compositions.ts`,
  `app/server/http.ts`, `app/server/index.ts`, `connectors/agents/claude.ts`,
  `connectors/agents/fakeComposer.ts`, `app/client/design/ComposeWorkspace.tsx`,
  `app/client/design/Library.tsx`, `app/client/design/Structure.tsx`,
  `app/client/design/ComposeChat.tsx`, `app/client/design/CompositionView.tsx`,
  `app/client/design/useComposition.ts`, `app/client/design/Simulator.tsx`,
  `app/client/App.tsx`, `app/client/styles.css`, `scripts/e2e-server.mjs`,
  `tests/composition.test.ts`, `tests/e2e/studio.spec.ts`, `README.md`,
  `docs/SECURITY.md`
- **Résumé** : page Design repensée en atelier de composition (onglet par
  défaut), l’éditeur de tokens restant dans l’onglet « Tokens du DS ».
  Bibliothèque des composants existants (Lisière et Studio) par catégorie,
  avec recherche, aperçu et variantes. Sections Flex/Grid responsives (pile,
  rangée, grille 1 à 4 colonnes, espacements `space.*`, repli sur une colonne
  sous 560 px). Structure réorganisable (boutons, glisser-déposer), sélection
  dans l’aperçu et inspecteur (variante, taille, texte, colonnes, lignes,
  largeur, position). Chat Claude en sortie structurée : proposition
  prévisualisée, à appliquer ou refuser ; question seulement si une information
  essentielle manque. Annuler / rétablir, brouillon conservé, pages enregistrées
  séparément des tokens.

## 2.13.0 — 2026-10-27

- **Type** : minor (nouvelle route locale `/api/assistant/model`, champ
  facultatif `model` dans `.ds-studio/assistant.json`, historique conservé)
- **Fichiers** : `connectors/agents/claude.ts`, `app/server/assistant.ts`,
  `app/server/http.ts`, `app/client/AssistantPage.tsx`, `app/client/Card.tsx`,
  `app/client/styles.css`, `tests/assistant.test.ts`,
  `tests/e2e/studio.spec.ts`, `docs/SECURITY.md`
- **Résumé** : Contexte & Assistant : conversation sur toute la hauteur
  (`100dvh` moins l’en-tête), historique défilant seul, saisie et Envoyer
  toujours visibles. Sélecteur de modèle (Claude Opus 5.5, Sonnet 5.5,
  Haiku 5.5) mémorisé côté serveur et utilisé pour chaque requête ; repli
  serveur seulement pour les modèles qui l’acceptent. Colonne droite en
  sections repliables (`CollapsibleCard`) ; chat prioritaire sur mobile.

## 2.12.0 — 2026-10-27

- **Type** : minor (page Design refaite ; API, schéma de tokens et données
  inchangés)
- **Fichiers** : `app/client/design/useDesignDraft.ts`,
  `app/client/design/TokenEditor.tsx`, `app/client/design/Simulator.tsx`,
  `app/client/design/componentSpecs.ts`, `app/client/DesignSystem.tsx`,
  `app/client/App.tsx`, `app/client/AssistantPage.tsx`, `app/client/Sidebar.tsx`,
  `app/client/HomePage.tsx`, `app/client/styles.css`, `tests/e2e/studio.spec.ts`,
  `README.md` ; supprimé : `app/client/useTokenDraft.ts`
- **Résumé** : l’atelier devient la page « Design » (`?vue=design`, ancienne
  adresse conservée). Éditeur à gauche (40 %) : tokens par catégorie avec
  contrôles visuels, recherche, brouillon multi-tokens persistant dans l’onglet,
  annuler / rétablir / réinitialiser, Enregistrer → diff → validation.
  Inspecteur de composants (bouton, champ, badge, carte, navigation : variantes,
  tailles, textes, états par défaut / survol / focus / erreur / désactivé),
  configuration mémorisée. Simulateur à droite (60 %) : vrais composants React
  dans une iframe alimentée par le brouillon, iPhone / iPad / desktop /
  personnalisé, poignées de redimensionnement (souris et clavier), zoom,
  dimensions et points de rupture, bascule brouillon / enregistré. Le panneau
  Assistant (Codex, brief privé) passe sur la page Contexte & Assistant.

## 2.11.0 — 2026-10-27

- **Type** : minor (nouvelle page par défaut ; l’atelier reste accessible via
  `?vue=atelier`)
- **Fichiers** : `app/client/HomePage.tsx`, `app/client/App.tsx`,
  `app/client/Sidebar.tsx`, `app/client/VolcanoDashboard.tsx`,
  `app/shared/brief.ts`, `app/client/styles.css`, `tests/e2e/studio.spec.ts`,
  `README.md`
- **Résumé** : Accueil « Tableau de bord » ouvert par défaut. Chaque indicateur
  n’apparaît qu’une fois : avancement (avec jalons repliables), prochaine
  échéance avec tâches à faire avant, temps restant avec alertes de retard.
  CTA « Ouvrir le brief du prof » et « Accéder à mon Notion » (liens existants,
  nouvel onglet, lecture seule). Cartes de navigation cliquables vers Atelier,
  Brief, Assistant et Volcan. Pages adressables par `?vue=` et conservées au
  rechargement. Dashboard Volcan conservé.

## 2.10.0 — 2026-10-27

- **Type** : minor (interface, données inchangées)
- **Fichiers** : `app/client/Card.tsx`, `app/client/ProjectContent.tsx`,
  `app/client/styles.css`, `tests/e2e/studio.spec.ts`
- **Résumé** : Brief : écart entre cartes +10 % (13,2 px, partagé), grand titre
  « Brief du projet » à la place de la phrase d’en-tête, sources Notion en pied
  de page. Planning : légende à gauche et « Détail des échéances » à droite sur
  une ligne (`Expandable`, flex `space-between`), retour à la ligne sur mobile.
  Cartes sans bande colorée.

## 2.9.0 — 2026-10-27

- **Type** : minor (mise en page, données inchangées)
- **Fichiers** : `app/client/Masonry.tsx`, `app/client/ProjectContent.tsx`,
  `app/client/VolcanoDashboard.tsx`, `app/client/AssistantPage.tsx`,
  `app/client/styles.css`, `tests/e2e/studio.spec.ts`
- **Résumé** : grille Bento « masonry » commune à toutes les pages (12 colonnes,
  classes de taille `size-s/q/m/l/half/full`). Chaque carte prend la hauteur de
  son contenu ; ouvrir un détail n’étire plus les voisines et la grille se
  recompacte seule. Test e2e avec plusieurs détails ouverts simultanément.

## 2.8.0 — 2026-10-27

- **Type** : minor (interface, données et API inchangées)
- **Fichiers** : `app/client/Card.tsx`, `app/client/Volcano.tsx`,
  `app/client/VolcanoDashboard.tsx`, `app/client/ProjectContent.tsx`,
  `app/client/AssistantPage.tsx`, `app/client/styles.css`,
  `tests/e2e/studio.spec.ts`
- **Résumé** : composant `Card` unique (marges, rayon, ombre, titres, emoji à
  taille de titre) pour Brief, Volcan et Assistant ; agrandissement ×5 des emojis
  retiré ; CSS des pages secondaires regroupée. Dashboard Volcan : volcan sur
  toute la colonne gauche, cartes à droite, « Avancement du projet » calculé
  depuis les tâches, intensité toujours liée aux dates. Volcan plus réaliste et
  léger : relief texturé statique, lave incandescente qui coule, fumée, cendres,
  braises, fontaine progressive, sans recadrage quel que soit le format.
  Vérifié sans débordement en 1440, 1024, 768 et 375 px.

## 2.7.0 — 2026-10-27

- **Type** : minor (nouvelle page et API locale `/api/assistant`, dépendance
  `@anthropic-ai/sdk` 0.133.0 épinglée)
- **Fichiers** : `connectors/agents/claude.ts`, `app/server/assistant.ts`,
  `app/server/http.ts`, `app/client/AssistantPage.tsx`, `app/client/Markdown.tsx`,
  `app/client/api.ts`, `app/client/Sidebar.tsx`, `app/client/App.tsx`,
  `app/client/VolcanoDashboard.tsx`, `app/client/styles.css`,
  `tests/assistant.test.ts`, `tests/e2e/studio.spec.ts`, `.env.example`,
  `README.md`, `CLAUDE.md`, `docs/SECURITY.md`, `package.json`,
  `package-lock.json`
- **Résumé** : onglet « Contexte & Assistant » avec chat Claude (claude-opus-5-5)
  via le serveur : streaming, Markdown sûr, saisie multiligne, historique
  persistant dans `.ds-studio/assistant.json`, sources citées, limites et
  erreurs gérées. Lecture seule du brief, planning, tâches, documents et tokens ;
  aucun outil d’écriture. Clé lue côté serveur uniquement. Testé avec un
  assistant simulé, pas contre l’API réelle.

## 2.6.0 — 2026-10-27

- **Type** : minor (nouvelle page, aucune page existante modifiée)
- **Fichiers** : `app/client/VolcanoDashboard.tsx`, `app/client/Sidebar.tsx`,
  `app/client/App.tsx`, `app/client/styles.css`, `tests/e2e/studio.spec.ts`
- **Résumé** : page secondaire « Dashboard Volcan » dans le menu. Volcan SVG
  animé dont l’activité suit la période réelle du PFE (25 sept. → 12 mars),
  éruption à l’échéance finale ; frise proportionnelle aux dates, cliquable pour
  prévisualiser l’activité, colorée par statut réel. Bento : accès aux pages,
  période, prochaine échéance, tâches, indicateurs. Animations coupées si
  « réduire les animations » est actif.

## 2.5.0 — 2026-10-27

- **Type** : minor (interface, données inchangées)
- **Fichiers** : `app/shared/brief.ts`, `app/client/useTasks.ts`,
  `app/client/ProjectContent.tsx`, `app/client/styles.css`,
  `tests/tasks.test.ts`
- **Résumé** : textes du chrome +2 px (composants du DS inchangés, pilotés par
  les tokens). Brief : grille Bento 6/4/2/1 colonnes sur toute la largeur et la
  hauteur, emojis en bannière (≈ ×5, adaptés à la hauteur d’écran), frise sans
  coupure (verticale sur mobile) colorée selon les statuts réels des tâches :
  validé, terminé, en cours, en retard, à venir. Données du brief centralisées
  dans `app/shared/brief.ts`.

## 2.4.0 — 2026-10-27

- **Type** : minor (nouvelle API locale `/api/tasks`, données existantes intactes)
- **Fichiers** : `app/client/Logo.tsx`, `app/client/ProjectContent.tsx`,
  `app/client/Sidebar.tsx`, `app/client/App.tsx`, `app/client/styles.css`,
  `app/shared/tasks.ts`, `app/server/tasks.ts`, `app/server/http.ts`,
  `launcher/index.html`, `launcher/launcher.css`, `launcher/INSTALLATION.html`,
  `tests/tasks.test.ts`, `tests/e2e/studio.spec.ts`, `package.json`,
  `package-lock.json`
- **Résumé** : logo 🌋 centralisé (`Logo`) et palette du chrome étendue au
  lanceur et au guide. Brief devenu une page Bento tenant sur un écran :
  frise des échéances, cartes à emoji repliées par défaut, checklist de 9 tâches
  avec statuts « À faire / Fait / Validé par le prof » sauvegardés dans
  `.ds-studio/tasks.json`. Contenu tiré de la note d’intention Notion, lue sans
  modification.

## 2.3.0 — 2026-10-27

- **Type** : minor (nouvel onglet, aucune donnée ni API modifiée)
- **Fichiers** : `app/client/ProjectContent.tsx`, `app/client/Sidebar.tsx`,
  `app/client/App.tsx`, `app/client/styles.css`, `tests/e2e/studio.spec.ts`,
  `package.json`, `package-lock.json`
- **Résumé** : onglet « Brief du projet » dans le menu de gauche : synthèse du
  brief PFE Notion (sujet, objectif, planning, cadrage, Design System, tests
  utilisateurs), consulté sans modification, avec lien vers la source.

## 2.2.0 — 2026-10-27

- **Type** : minor (interface, aucune donnée ni API modifiée)
- **Fichiers** : `app/client/Sidebar.tsx`, `app/client/icons/*.svg`,
  `app/client/App.tsx`, `app/client/styles.css`, `package.json`,
  `package-lock.json`
- **Résumé** : l’atelier devient un dashboard avec menu vertical à gauche
  (sections, historique, statut local et Figma). Couleurs, rayons, ombres et
  icônes du chrome repris du DS Figma de référence, lu sans modification. Les
  tokens éditables du DS restent indépendants du chrome.

## 2.1.0 — 2026-10-27

- **Type** : minor (fonctionnalité compatible, schéma de tokens inchangé)
- **Fichiers** : `connectors/figma/sync.ts`, `scripts/figma-sync.ts`,
  `tests/figma.test.ts`, `.agents/skills/figma-sync/SKILL.md`,
  `workspace/figma.config.example.json`, `docs/FIGMA.md`, `docs/TOKENS.md`,
  `README.md`, `AGENTS.md`, `package.json`, `package-lock.json`
- **Résumé** : synchronisation Figma via le MCP officiel de l’agent externe :
  comparaison tokens/composants sur cible autorisée, import par le diff local,
  plan d’écriture haché vérifié avant/après, skill `figma-sync`. Testé sur
  fixtures ; aucun fichier Figma réel testé.

## 2.0.0 — 2026-10-27

- **Type** : version de départ
- **Commit** : `12aeaef`
- **Fichiers** : import complet du starter DS-Studio V2 (89 fichiers)
- **Résumé** : point de départ du dépôt privé `audrey-creator23/ds-studio`, sans
  modification du starter.
