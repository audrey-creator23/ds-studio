# Créer ou modifier un composant

À lire seulement pour une tâche de composant. Suivre les étapes dans
l’ordre ; s’arrêter et demander dès qu’un choix change le DS.

## 1. Besoin

- Qui l’utilise, pour quelle action, dans quel écran ?
- Heuristiques utiles : visibilité de l’état, prévention d’erreur,
  reconnaissance plutôt que rappel, cohérence, contrôle (annuler, quitter).

## 2. Audit avant de créer

- Chercher l’existant : `app/v3/ui.tsx` (Card, Button, Badge, Progress,
  ToggleGroup), composants du DS (`blockSpecs` dans
  `app/shared/composition.ts`), styles `app/v3/v3.css`.
- Réutiliser ou ajouter une **variante** plutôt qu’un nouveau composant.
- Couleurs et espaces : tokens seulement (`app/v3/tokens.css`, `--accent-*`,
  `--selected*`, `--deco-*` dans `v3.css`) ; aucune valeur en dur nouvelle.
- Skill projet : `.agents/skills/component-audit/` (sur accord).

## 3. Accessibilité WCAG 2.2 AA

- Contraste : texte 4,5:1, grand texte et éléments d’interface 3:1, en
  clair **et** sombre (outil Contraste de l’espace Design).
- Focus visible, ordre logique, tout au clavier (Entrée, Échap, flèches si
  liste ou onglets), cibles ≥ 24 px.
- États : repos, survol, focus, actif (`--selected`, noir/blanc), désactivé,
  erreur, chargement ; jamais la couleur seule pour un sens.
- Responsive : 375 px sans défilement horizontal ; mouvement réduit respecté.
- Rôles et noms ARIA justes (bouton, onglet, dialogue, statut, alerte).

## 4. Proposition (avant code si choix majeur)

Court tableau : structure (éléments), propriétés (props, variantes,
tailles), comportements (états, clavier, erreurs), justification en une
phrase par choix.

## 5. Cohérence

- Zéro doublon (nom, style, logique) ; mêmes noms que Figma si mappé
  (`figma-plugin/mapping.json`).
- Test : unitaire si logique, e2e Playwright si interaction ;
  `VERSION_HISTORY.md` mis à jour.
