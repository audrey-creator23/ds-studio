# Historique des versions

Une entrée par modification de code validée, la plus récente en premier.
Numérotation [SemVer](https://semver.org/lang/fr/) : **patch** pour un correctif,
**minor** pour une fonctionnalité compatible, **major** pour un changement incompatible
(schéma de tokens, API, format de données). La version suit `package.json`.

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
