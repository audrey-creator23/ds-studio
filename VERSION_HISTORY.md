# Historique des versions

Une entrée par modification de code validée, la plus récente en premier.
Numérotation [SemVer](https://semver.org/lang/fr/) : **patch** pour un correctif,
**minor** pour une fonctionnalité compatible, **major** pour un changement incompatible
(schéma de tokens, API, format de données). La version suit `package.json`.

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
