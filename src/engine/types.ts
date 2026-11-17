export const INGREDIENT_IDS = ['dough', 'sauce', 'cheese', 'olives', 'sausage', 'mushrooms'] as const;
export type IngredientId = typeof INGREDIENT_IDS[number];
export type Amounts = Record<IngredientId, number>;
export type PizzaSize = 15 | 30 | 45;
export const SIZE_FACTORS: Record<PizzaSize, number> = { 15: 1, 30: 4, 45: 9 };

export function amounts(values: readonly number[] = []): Amounts {
  return Object.fromEntries(INGREDIENT_IDS.map((id, i) => [id, values[i] ?? 0])) as Amounts;
}

export interface Ingredient {
  id: IngredientId;
  name: string;
}
export interface Recipe {
  id: string;
  name: string;
  portions: Amounts;
}
export interface Offer {
  recipeId: string;
  size: PizzaSize;
  price: number;
}
export interface Level {
  id: number;
  title: string;
  lesson: string;
  tip?: string;
  hints: readonly string[];
  ingredientIds: readonly IngredientId[];
  stock: Amounts;
  costs: Amounts;
  sizes: readonly PizzaSize[];
  recipes: readonly Recipe[];
  offers: readonly Offer[];
}
export type LevelDefinition = Omit<Level, 'stock'> & { delivery: Amounts };
export interface RoundInventory {
  levelId: number;
  carryover: Amounts;
  delivery: Amounts;
  best?: { profit: number; stars: number; remaining: Amounts };
  migrated?: boolean;
}
export interface Batch {
  id: number;
  size: PizzaSize;
  // Фактические порции на одну пиццу, включая тесто.
  portions: Amounts;
  quantity: number;
}
export type PlanIssue =
  | { type: 'empty' }
  | { type: 'unknown-recipe' | 'invalid-batch'; batchId: number }
  | { type: 'shortage'; ingredientId: IngredientId; missing: number };
export interface BatchEvaluation {
  batchId: number;
  recipe?: Recipe;
  portions: Amounts;
  unitCost: number;
  unitPrice: number;
  cost: number;
  revenue: number;
}
export interface PlanEvaluation {
  batches: BatchEvaluation[];
  used: Amounts;
  remaining: Amounts;
  cost: number;
  revenue: number;
  profit: number;
  pizzaCount: number;
  issues: PlanIssue[];
  canCook: boolean;
}
export interface OptimalPlan {
  profit: number;
  batches: Batch[];
}
export interface RoundResult {
  carryover: Amounts;
  keptBest: boolean;
  grossProfit: number;
  hintCost: number;
  awarded: number;
  previousBest: number;
  profit: number;
  optimum: number;
  stars: number;
  revenue: number;
  cost: number;
}
export interface LevelProgress {
  stars: number;
  profit: number;
}
export interface NotebookRow {
  id: number;
  pizzas: string;
  profit: string;
}
export interface Progress {
  version: 3;
  round?: RoundInventory;
  balance: number;
  levels: Record<number, LevelProgress>;
  notebooks: Record<number, NotebookRow[]>;
  seenFeatures: string[];
}
