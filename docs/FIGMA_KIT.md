# Kit Figma shadcn/ui → DS-Studio

Référence UI commune du chrome DS-Studio : le kit Figma **shadcn/ui
components** de sitsiilia (copie de travail
`TLJ2WHXTd7ahfmUxvu2qT9`, lue en lecture seule via le MCP Figma ; le fichier
source n’est jamais modifié).

Le kit est écrit pour Tailwind v4 + Radix. DS-Studio ne l’installe pas : ses
**tokens et ses variantes sont reproduits dans le thème Mantine**
([`app/client/theme.ts`](../app/client/theme.ts)), sans dépendance ni
composant en double. La palette Sunflower → Mahogany garde les rôles de
couleur (primary, accent, warning, danger, surfaces).

## Skill Claude Code associé

La page « ✳️ Claude skill » du fichier renvoie à
`Sitsiilia/shadcn-figma`, dépôt introuvable (404). Le même auteur publie
[`Sitsiilia/shadcn-figma-skill`](https://github.com/Sitsiilia/shadcn-figma-skill)
(MIT, skill `figma-shadcn-by-sitsiilia`). Audit : `scripts/find.mjs` ne fait
que lire ses fichiers (aucun réseau, aucune commande). Installation, à lancer
soi-même :

```bash
git clone https://github.com/Sitsiilia/shadcn-figma-skill.git ~/.claude/skills/figma-shadcn-by-sitsiilia
```

Ses réponses supposent les composants shadcn (`@/components/ui/*`) : dans
DS-Studio, s’en servir comme référence d’API et de géométrie, puis écrire
l’équivalent Mantine ci-dessous.

## Tokens importés

| Kit                | Valeur                                                                                    | DS-Studio                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Police             | Inter                                                                                     | `@fontsource-variable/inter` (local, hors ligne)                              |
| Tailles            | 12/16 · 14/20 · 16/24 · 18/28 · 20/28                                                     | `fontSizes`, `lineHeights`                                                    |
| Rayons             | base **14** (`--radius: 0.875rem`, thème shadcn/create) : 8 · 10 · 12 · 14 · 18 · 22 · 26 | `radiusBase` et `radii` (theme.ts), défaut `lg`                               |
| Ombres             | xs, md, lg, noir 10 %                                                                     | `shadows`, `--ui-shadow-*`                                                    |
| Focus              | bordure `#737373` + halo 3 px `#A1A1A180`                                                 | `--ui-focus`, `--ui-ring-subtle`                                              |
| Neutres            | `#0A0A0A`, `#737373`, `#E5E5E5`, `#F5F5F5`                                                | `--ui-fg`, `--ui-fg-support`, `--ui-border`, `--ui-muted`                     |
| Ring (focus)       | `#A1A1A1` dans le thème collé                                                             | conservé `#737373` pour la bordure de focus (3:1 minimum ; `#A1A1A1` = 2,6:1) |
| Couleurs de marque | neutres du kit                                                                            | **palette du studio** (choix validé)                                          |

Pour appliquer un autre thème de ui.shadcn.com/create : « Get Code » →
onglet Theme → « Copy Theme », puis coller le CSS à Claude. Seuls les neutres
et `--radius` sont repris ; le mode sombre n’est pas utilisé (interface
claire) et les couleurs `--chart-*` attendent un premier graphique.

## Composants disponibles

| Figma (kit)                              | DS-Studio                                                       | Variantes / tailles                                                                                       |
| ---------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Button                                   | Mantine `Button`                                                | `filled` (= default), `outline`, `secondary`, `ghost`, `destructive`, `link` · xs 24, sm 28, md 32, lg 36 |
| Badge                                    | Mantine `Badge`                                                 | `filled`, `secondary`, `destructive` (teinte), `outline`, `ghost` · h 22                                  |
| Card                                     | `Surface` / Mantine `Card`                                      | rayon xl (18), bordure, ombre xs ; tailles default (24) et sm (16)                                        |
| Tabs                                     | Mantine `Tabs`                                                  | `className="kit-tabs"` (pastille sur rail) ou défaut (= line)                                             |
| Input / Textarea / Native Select / Field | Mantine `TextInput`, `Textarea`, `NativeSelect` ; champs natifs | h 32, rayon lg (14), ombre xs, libellé + description                                                      |
| Alert                                    | Mantine `Alert`                                                 | `outline` (default), `destructive`                                                                        |
| Progress                                 | Mantine `Progress` / `TaskProgress`                             | couleur de rôle                                                                                           |
| Sidebar menu                             | Mantine `NavLink` (`Sidebar.tsx`)                               | h 32, rayon md (12), actif neutre, rétractable                                                            |
| Bubble                                   | `.chat-bubble`, `.kit-bubble`                                   | reçu (muted), envoyé (primary), outline, destructive · rayon 3xl (26), angle 6                            |

Dans l’atelier Design, la catégorie **Kit shadcn · Mantine** propose Bouton,
Badge, Alerte, Progression, Champ, Onglets, Carte et Bulle de chat ; Claude
peut les utiliser pour composer une page, et le simulateur les prévisualise.

Non repris pour l’instant (absents de l’interface) : Accordion, Calendar,
Carousel, Chart, Combobox, Command, Data Table, Date Picker, Drawer, Dropdown
Menu, Menubar, Questionnaire, Toast, etc. Les ajouter suit le même principe :
composant Mantine + variante résolue par le thème.
