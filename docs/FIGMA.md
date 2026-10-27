# Figma : source de vérité réelle, pas intégration simulée

**2.1 : PARTIAL.** L’application reste **non connectée** à Figma (`figmaStatus`
inchangé). La comparaison, le convertisseur, le plan d’écriture et ses vérifications
sont implémentés et **testés sur fixtures** (`tests/figma.test.ts`). Aucune lecture
ni écriture sur un vrai fichier Figma n’a encore été réalisée.

La [documentation Figma officielle du serveur distant](https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/)
indique que seuls les clients du catalogue autorisé peuvent se connecter. Un
nouveau client doit passer par la procédure d’admission. DS-Studio n’est pas déclaré
client autorisé. Ne jamais usurper un client, extraire un jeton, réutiliser une session
Codex ou recopier des cookies pour contourner cette restriction.

## Parcours 2.1 : agent externe autorisé + contrôleur local

```
Figma ──MCP officiel (OAuth de l’étudiant)──▶ agent externe ──snapshot.json──▶ npm run figma
                                                                                │
   Figma ◀── écriture bornée (après hash validé + verify before) ◀── push-plan.json
   DS-Studio ◀── Importer un JSON → diff → validation ◀── figma-import.tokens.json
```

1. **Authentification** : l’étudiant connecte le serveur MCP Figma officiel dans son
   client (Claude Code, Codex…) avec son propre compte. DS-Studio ne voit aucun jeton.
2. **Cible** : copier `workspace/figma.config.example.json` vers
   `workspace/private/figma/config.json` (ignoré par Git), renseigner `fileKey`, `nodeId`
   et le mapping explicite variables → tokens, composants Figma → composants locaux.
3. **Lecture** : l’agent écrit `snapshot.json` à partir de `get_variable_defs` et
   `get_metadata`. `npm run figma -- compare` refuse toute autre cible et classe chaque
   token : `same`, `different`, `missing`, `invalid` (alpha, unité, police hors liste).
4. **Figma → DS-Studio** : `npm run figma -- pull` produit un fichier complet à importer
   par l’interface. Le diff et la validation restent ceux du mode manuel.
5. **DS-Studio → Figma** : `npm run figma -- plan` crée un plan haché (cible, lecture,
   valeurs `from → to`). L’étudiant valide en citant le hash. `verify before` sur une
   lecture fraîche refuse un changement concurrent ; l’agent écrit seulement ces
   variables ; `verify after` relit. `audit.jsonl` garde la trace, sans secret.

Procédure complète : `.agents/skills/figma-sync/SKILL.md`. Les composants sont
**comparés par nom** seulement ; aucune écriture de composant n’est prévue.
Limite : la validation par hash est une procédure de l’agent, pas une barrière
technique. Les permissions d’écriture réelles restent celles du client MCP.
Travailler d’abord sur une copie de test du fichier.

## Intégration future : contrat, pas code opérationnel

`connectors/figma/contract.ts` sépare lecture, proposition et application validée.
Une réalisation doit :

- Employer un client officiellement autorisé et l’OAuth officiel propre à l’étudiant.
  Tester d’abord une lecture minimale d’un **fichier de test explicitement autorisé**.
- Définir une liste autorisée de fichier et variables, avec une révision de départ.
  Échouer si la cible, les droits ou la révision diffèrent.
- Préparer un diff structuré, afficher l’impact et obtenir une validation humaine
  liée au hash de la proposition, à la cible et à la révision, à usage unique.
- Recontrôler les droits et la révision juste avant l’écriture, limiter l’opération,
  relire les valeurs après exécution et garder une trace d’audit sans secret.
- En cas de timeout, relire avant toute nouvelle tentative pour ne pas doubler une
  écriture. Prévoir refus, annulation, révocation et restauration sur une copie.

L’agent de discussion ne doit jamais disposer simultanément d’un MCP Figma libre.
Un simple skill « demande confirmation » ne constitue pas une barrière. Conserver
les outils distants derrière le contrôleur, ou rester non connecté si le fournisseur
ne permet pas ce contrôle. Le contrat TypeScript ne met pas en œuvre ces garanties.

Le serveur officiel dispose d’outils d’écriture ; ne pas supposer qu’un accès MCP
est en lecture seule. Les [outils officiels](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/)
et les [droits et limites](https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/)
seront à relire lors de la connexion, car ils peuvent évoluer.
