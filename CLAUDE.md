# Claude Code

Lisez START_HERE.md et AGENTS.md : ce sont les instructions communes du projet.
L’assistant Claude intégré (page Contexte & Assistant) est en lecture seule,
sans outils ; il n’a pas été testé contre l’API réelle. Vous pouvez modifier le starter
depuis votre terminal avec vos propres permissions, sans prétendre que cela
valide l’adaptateur embarqué. Pour les tokens, lisez explicitement
`.agents/skills/token-change/SKILL.md`. N’importez aucun cache de compte.

## Économie de contexte

- Ne lire que le guide utile à la tâche, jamais tous :
  composant → `docs/COMPONENT_GUIDELINES.md` ;
  écran ou bloc → `docs/CREATIVE_PROCESS.md` ;
  Figma → `figma-plugin/README.md` ; tokens → skill `token-change`.
- Skills (`.agents/skills/*`, plugins Figma) : annoncer l’utilité et le coût
  approximatif en tokens, puis attendre l’accord avant chaque installation,
  chargement ou utilisation. Aucun déclenchement automatique sans accord.
- Après chaque modification validée : `VERSION_HISTORY.md` ; accord avant
  tout commit ou push.
