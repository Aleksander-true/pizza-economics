import { amounts, INGREDIENT_IDS, type Amounts, type Level, type LevelDefinition, type RoundInventory } from './types';

export function createRound(level: LevelDefinition, carryover: Amounts = amounts()): RoundInventory {
  return { levelId: level.id, carryover: { ...carryover }, delivery: { ...level.delivery } };
}

export function prepareLevel(definition: LevelDefinition, round: RoundInventory): Level {
  const { delivery, ...level } = definition;
  return { ...level, stock: amounts(INGREDIENT_IDS.map(id => round.carryover[id] + round.delivery[id])) };
}
