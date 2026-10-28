# DS-Studio Bridge (plugin Figma)

Importe un écran de DS-Studio dans la page Figma ouverte : calques nommés et
éditables, Auto Layout natif, instances des composants maîtres du fichier
quand ils existent, variables pour les tokens. Jamais d’image aplatie.

## Installer (une fois)

1. Construire le plugin :

   ```bash
   npm run figma:plugin
   ```

2. Dans **Figma desktop** : menu Plugins → Development → **Import plugin from
   manifest…** → choisir `figma-plugin/manifest.json`.
3. DS-Studio doit tourner : `npm run service -- status` (serveur
   `127.0.0.1:4310`).

## Utiliser (automatique)

Fichier cible fixe : « DS-Studio — Mes maquettes », page 1
(`app/shared/figmaTarget.ts`). Le plugin n’importe nulle part ailleurs.
Figma ne lance jamais un plugin tout seul à l’ouverture d’un fichier :
une action reste nécessaire par session Figma, puis tout est automatique.

1. DS-Studio : Design → **Enregistrer** → **Figma** → **Valider**. Si le
   plugin n’est pas ouvert, le fichier Figma cible s’ouvre.
2. Figma : cliquez **Importer depuis DS-Studio** dans le panneau de droite
   (rien de sélectionné), ou ⌥⌘P (relancer le dernier plugin). Le plugin
   importe aussitôt le dernier envoi, sans code ni clic.
3. Laissez le plugin ouvert : chaque nouvel envoi s’importe en 3 s. Le
   bouton **Actualiser Figma** (barre de l’aperçu) met à jour l’écran à sa
   place, sans doublon ni confirmation ; succès affiché seulement après le
   compte rendu du plugin.
4. Premier remplacement d’un écran : confirmation, avec l’option « mettre à
   jour cet écran automatiquement » (cochée). Seul son cadre est remplacé.
5. Première utilisation seulement : code d’appairage affiché par DS-Studio,
   mémorisé ensuite dans Figma. La version du plugin est affichée à côté
   du titre (v2.34).

## Ce qui est repris

- Tailles, positions, espacements, padding, gap, alignements mesurés sur le
  rendu réel de l’aperçu (appareil et thème courants).
- Conteneurs flex → Auto Layout (direction, wrap, gap, padding, alignements,
  Hug / Fill / Fixed) ; grilles → Auto Layout avec retour à la ligne (une
  colonne → vertical) ; blocs sans flex → Auto Layout vertical si
  l’espacement est régulier, sinon positions exactes.
- Textes (police, graisse, taille, interlignage, approche, couleur,
  alignement, majuscules, soulignement), icônes SVG (vecteurs éditables),
  fonds, bordures, rayons par coin, ombres portées, opacité, masquage.
- Identité DS de chaque bloc (type, variante, taille, texte) dans le nom du
  calque et ses données de plugin.
- Composants : si le fichier contient un maître dont le nom figure dans
  `mapping.json` (ex. « Button »), une **instance liée** est créée avec la
  variante correspondante (propriétés `Variant` / `Size`) et le texte.
  Sinon, le bloc est construit en calques. Modifiez `mapping.json` pour
  vos noms de composants, puis reconstruisez.
- Tokens couleur et dimension → variables ; les fonds et bordures dont la
  couleur est exactement celle d’un token y sont liés.

## Signalé, jamais approché en silence

La fin de l’import liste les écarts : police absente remplacée (Inter
Variable → Inter, police système → SF Pro puis Inter), variante absente,
taille d’instance différente du rendu, fond en dégradé ou image, contenu CSS
`::before` / `::after`, bordures différentes selon les côtés, ordre inversé,
taille finale différente du rendu.

## Tester

- Automatique : `npm test` (importeur sur une maquette de l’API Figma :
  Auto Layout, tailles, textes, variables, instances, remplacement sans
  doublon) et `npx playwright test` (scène mesurée, appairage, refus des
  autres origines).
- Dans Figma : importer un écran, comparer à l’aperçu DS-Studio au même
  appareil, redimensionner le cadre racine (les sections en Fill suivent),
  modifier un texte, vérifier les variables dans Local variables.

## Sécurité

Lecture seule de `http://localhost:4310/api/figma/scene` (même serveur, nom exigé par Figma), uniquement avec
le code d’appairage (fichier privé `.ds-studio/figma-bridge.key`, hors
Git). Aucun autre accès réseau (`manifest.json`). Le plugin n’écrit que dans
le fichier ouvert, quand vous lancez l’import.
