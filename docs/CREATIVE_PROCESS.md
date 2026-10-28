# Processus créatif (écran ou bloc)

À lire seulement pour concevoir un écran ou un bloc. Assembler l’existant
avant d’inventer ; montrer la proposition avant le code si le choix est
structurant.

## 1. Besoin et pattern

Objectif de l’utilisatrice en une phrase, puis pattern connu le plus simple
(formulaire, liste, carte, tableau de bord, assistant, état vide).

## 2. Contraintes

- UX : charge cognitive, erreurs possibles, retour d’état, annulation.
- DS : composants et tokens disponibles (voir
  `docs/COMPONENT_GUIDELINES.md`, étape 2), clair/sombre, WCAG 2.2 AA.

## 3. Assemblage

- Hiérarchie : un titre, une action principale, le reste en secondaire.
- Grille et espaces : tokens `space.*`, alignements réguliers.
- Interactions et états : survol, focus, chargement, succès, erreur, vide.
- Microcopie : verbes d’action, phrases courtes, erreurs qui disent quoi
  faire.
- Responsive : empilement en 375 px, cibles tactiles.

## 4. Proposition justifiée

Si choix majeur : schéma texte ou maquette dans l’espace Design, 3 à 5
justifications, accord avant d’écrire le code.

## Exemple : carte e-mail

| Élément    | Choix                                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------- |
| Label      | « Adresse e-mail », visible (pas seulement un placeholder)                                                    |
| Champ      | `type="email"`, `autocomplete="email"`, hauteur 40 px                                                         |
| Aide       | « Nous l’utilisons seulement pour vos rappels. »                                                              |
| Validation | au départ du champ et à l’envoi, pas à chaque frappe                                                          |
| Erreur     | sous le champ, `aria-describedby`, texte + icône, pas la couleur seule : « Ajoutez un @, ex. nom@domaine.fr » |
| CTA        | un seul bouton principal « Enregistrer », désactivé seulement pendant l’envoi                                 |
| Succès     | statut annoncé (`role="status"`) : « Adresse enregistrée. »                                                   |
