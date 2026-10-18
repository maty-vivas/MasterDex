import { TYPES } from '../data/constants.js';

// Tipos defensores a los que cada tipo atacante hace daño doble, reducido o nulo.
// El chart usa las reglas modernas de efectividad (generaciones VI en adelante).
const TYPE_RELATIONS = {
  normal: { double: [], half: ['rock', 'steel'], zero: ['ghost'] },
  fire: { double: ['grass', 'ice', 'bug', 'steel'], half: ['fire', 'water', 'rock', 'dragon'], zero: [] },
  water: { double: ['fire', 'ground', 'rock'], half: ['water', 'grass', 'dragon'], zero: [] },
  electric: { double: ['water', 'flying'], half: ['electric', 'grass', 'dragon'], zero: ['ground'] },
  grass: { double: ['water', 'ground', 'rock'], half: ['fire', 'grass', 'poison', 'flying', 'bug', 'dragon', 'steel'], zero: [] },
  ice: { double: ['grass', 'ground', 'flying', 'dragon'], half: ['fire', 'water', 'ice', 'steel'], zero: [] },
  fighting: { double: ['normal', 'ice', 'rock', 'dark', 'steel'], half: ['poison', 'flying', 'psychic', 'bug', 'fairy'], zero: ['ghost'] },
  poison: { double: ['grass', 'fairy'], half: ['poison', 'ground', 'rock', 'ghost'], zero: ['steel'] },
  ground: { double: ['fire', 'electric', 'poison', 'rock', 'steel'], half: ['grass', 'bug'], zero: ['flying'] },
  flying: { double: ['grass', 'fighting', 'bug'], half: ['electric', 'rock', 'steel'], zero: [] },
  psychic: { double: ['fighting', 'poison'], half: ['psychic', 'steel'], zero: ['dark'] },
  bug: { double: ['grass', 'psychic', 'dark'], half: ['fire', 'fighting', 'poison', 'flying', 'ghost', 'steel', 'fairy'], zero: [] },
  rock: { double: ['fire', 'ice', 'flying', 'bug'], half: ['fighting', 'ground', 'steel'], zero: [] },
  ghost: { double: ['psychic', 'ghost'], half: ['dark'], zero: ['normal'] },
  dragon: { double: ['dragon'], half: ['steel'], zero: ['fairy'] },
  dark: { double: ['psychic', 'ghost'], half: ['fighting', 'dark', 'fairy'], zero: [] },
  steel: { double: ['ice', 'rock', 'fairy'], half: ['fire', 'water', 'electric', 'steel'], zero: [] },
  fairy: { double: ['fighting', 'dragon', 'dark'], half: ['fire', 'poison', 'steel'], zero: [] },
};

const DAMAGE_GROUPS = [
  { multiplier: 4, className: 'quadruple' },
  { multiplier: 2, className: 'double' },
  { multiplier: 1, className: 'neutral' },
  { multiplier: 0.5, className: 'half' },
  { multiplier: 0.25, className: 'quarter' },
  { multiplier: 0, className: 'immune' },
];

/** Calcula el daño recibido por cada tipo de ataque frente a uno o varios tipos defensores. */
export function typeEffectivenessGroups(defendingTypes = []) {
  const defenders = defendingTypes.filter((type) => TYPES.includes(type));
  if (!defenders.length) return [];

  const typesByMultiplier = new Map(DAMAGE_GROUPS.map(({ multiplier }) => [multiplier, []]));

  for (const attackType of TYPES) {
    const multiplier = defenders.reduce((total, defendingType) => {
      const relations = TYPE_RELATIONS[attackType];
      if (relations.zero.includes(defendingType)) return total * 0;
      if (relations.double.includes(defendingType)) return total * 2;
      if (relations.half.includes(defendingType)) return total * 0.5;
      return total;
    }, 1);
    typesByMultiplier.get(multiplier)?.push(attackType);
  }

  // Se omiten categorías vacías; los tipos neutrales se muestran cuando existan.
  return DAMAGE_GROUPS
    .filter(({ multiplier }) => typesByMultiplier.get(multiplier).length > 0)
    .map((group) => ({ ...group, types: typesByMultiplier.get(group.multiplier) }));
}
