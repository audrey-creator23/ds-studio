import type { RiskId } from '../../app/v3/carte/risks.js';

// Réponses courtes pour « Je suis en danger » : consignes générales des
// autorités (Géorisques, préfecture, Météo-France, OVSM), jamais un ordre
// d'évacuation déduit : l'application n'en connaît aucun.
export const noOrder =
  'Aucun ordre d’évacuation officiel n’est connu de l’application : écoutez la radio et suivez la préfecture.';

export const evacuate: Record<RiskId, string> = {
  seisme:
    'Pendant la secousse : ne sortez pas, abritez-vous. Après : sortez calmement si le bâtiment est endommagé ; près de la mer, montez vers les hauteurs.',
  tsunami:
    'Oui, sans attendre, si la terre a tremblé fort ou si la mer se retire : à pied, vers les hauteurs ou un étage élevé.',
  cyclone:
    'Pas pendant le cyclone : restez à l’abri. Évacuez seulement sur ordre des autorités, avant l’arrivée.',
  volcan:
    'Seulement sur ordre des autorités : suivez l’itinéraire d’évacuation officiel.',
  pluies:
    'Montez à l’étage. Ne traversez jamais une zone inondée, à pied ou en voiture.',
  sargasses: 'Éloignez-vous des zones d’échouement si l’odeur est forte.',
  brume: 'Pas d’évacuation : limitez les efforts dehors.',
};

export const shelter: Record<RiskId, string> = {
  seisme:
    'Sous un meuble solide, loin des vitres. Dehors : loin des bâtiments et des câbles.',
  tsunami:
    'En hauteur, ou à un étage élevé d’un bâtiment solide, loin du rivage.',
  cyclone: 'Dans la pièce la plus sûre, sans fenêtre, au centre du logement.',
  volcan:
    'À l’intérieur, portes et fenêtres fermées ; masque FFP2 contre les cendres.',
  pluies: 'À l’étage, loin des ravines et des rivières.',
  sargasses: 'À l’intérieur, fenêtres fermées si l’odeur est forte.',
  brume: 'À l’intérieur, surtout les personnes sensibles.',
};

export const situations: [string, string][] = [
  [
    'Je suis blessé',
    'Appelez le 15 ou le 112. Ne déplacez pas un blessé grave, sauf danger immédiat.',
  ],
  [
    'Je suis avec des enfants ou une personne dépendante',
    'Gardez-les avec vous, prenez leurs médicaments, signalez-les aux secours.',
  ],
  ['Je ne peux pas parler', 'Envoyez un SMS au 114.'],
  [
    'Je ne peux pas me déplacer',
    'Signalez votre position aux secours. Faites du bruit (sifflet, coups) pour être repéré.',
  ],
  [
    'Pas de position GPS',
    'Donnez l’adresse ou des repères visibles : route, bâtiment, commune.',
  ],
  [
    'Pas de réseau',
    'Si un réseau mobile est disponible, le 112 peut passer par un autre opérateur. Sinon, préparez vos messages et écoutez la radio.',
  ],
  [
    'Batterie faible',
    'Baissez la luminosité, activez l’économie d’énergie, préférez les SMS aux longs appels.',
  ],
  [
    'Consignes contradictoires ou anciennes',
    'Les consignes des autorités (radio, préfecture) priment. Vérifiez la date des informations.',
  ],
];
