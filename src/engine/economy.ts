import { amounts, INGREDIENT_IDS, SIZE_FACTORS, type Batch, type BatchEvaluation, type Level, type OptimalPlan, type PlanEvaluation, type PlanIssue } from './types';

export function createBatch(id: number): Batch {
  return { id, size: 15, portions: amounts([1]), quantity: 1 };
}

export function evaluatePlan(level: Level, batches: readonly Batch[]): PlanEvaluation {
  const used = amounts();
  const issues: PlanIssue[] = [];
  let cost = 0, revenue = 0, pizzaCount = 0;
  const evaluated: BatchEvaluation[] = [];
  for (const batch of batches) {
    const factor = SIZE_FACTORS[batch.size];
    const valid = level.sizes.includes(batch.size) && Number.isSafeInteger(batch.quantity) && batch.quantity >= 0
      && batch.portions.dough === 1
      && INGREDIENT_IDS.every(id => Number.isSafeInteger(batch.portions[id]) && batch.portions[id] >= 0
        && (level.ingredientIds.includes(id) || batch.portions[id] === 0));
    if (!valid) {
      issues.push({ type: 'invalid-batch', batchId: batch.id });
      continue;
    }
    const portions = amounts(INGREDIENT_IDS.map(id => batch.portions[id] * factor));
    const recipe = level.recipes.find(candidate => INGREDIENT_IDS.every(id => candidate.portions[id] === batch.portions[id]));
    const offer = recipe && level.offers.find(item => item.recipeId === recipe.id && item.size === batch.size);
    const unitCost = INGREDIENT_IDS.reduce((sum, id) => sum + portions[id] * level.costs[id], 0);
    const unitPrice = offer?.price ?? 0;
    const batchCost = unitCost * batch.quantity;
    const batchRevenue = unitPrice * batch.quantity;
    if (batch.quantity > 0 && !offer) issues.push({ type: 'unknown-recipe', batchId: batch.id });
    for (const id of INGREDIENT_IDS) used[id] += portions[id] * batch.quantity;
    pizzaCount += batch.quantity;
    cost += batchCost;
    revenue += batchRevenue;
    evaluated.push({ batchId: batch.id, recipe: offer ? recipe : undefined, portions, unitCost, unitPrice, cost: batchCost, revenue: batchRevenue });
  }
  if (pizzaCount === 0) issues.push({ type: 'empty' });
  const remaining = amounts(INGREDIENT_IDS.map(id => level.stock[id] - used[id]));
  for (const id of INGREDIENT_IDS) {
    if (remaining[id] < 0) issues.push({ type: 'shortage', ingredientId: id, missing: -remaining[id] });
  }
  return { batches: evaluated, used, remaining, cost, revenue, profit: revenue - cost, pizzaCount, issues, canCook: issues.length === 0 };
}

export function findOptimalPlan(level: Level): OptimalPlan {
  const variants = level.offers.map(offer => {
    const recipe = level.recipes.find(item => item.id === offer.recipeId);
    if (!recipe || recipe.portions.dough < 1) throw new Error('Рецепт должен содержать тесто');
    const use = INGREDIENT_IDS.map(id => recipe.portions[id] * SIZE_FACTORS[offer.size]);
    const margin = offer.price - use.reduce((sum, count, i) => sum + count * level.costs[INGREDIENT_IDS[i]], 0);
    return { recipe, size: offer.size, use, margin };
  });
  const cache = new Map<string, { profit: number; counts: number[] }>();
  function solve(index: number, remaining: number[]): { profit: number; counts: number[] } {
    if (index === variants.length) return { profit: 0, counts: [] };
    const key = `${index}:${remaining.join(',')}`;
    const cached = cache.get(key);
    if (cached) return cached;
    const variant = variants[index];
    const limit = Math.min(...variant.use.flatMap((n, i) => n > 0 ? [Math.floor(remaining[i] / n)] : []));
    let best = { profit: -Infinity, counts: [] as number[] };
    for (let quantity = 0; quantity <= limit; quantity++) {
      const next = solve(index + 1, remaining.map((n, i) => n - variant.use[i] * quantity));
      const profit = quantity * variant.margin + next.profit;
      if (profit > best.profit) best = { profit, counts: [quantity, ...next.counts] };
    }
    cache.set(key, best);
    return best;
  }
  const result = solve(0, INGREDIENT_IDS.map(id => level.stock[id]));
  return {
    profit: result.profit,
    batches: result.counts.flatMap((quantity, i) => quantity ? [{
      id: i + 1, size: variants[i].size, portions: { ...variants[i].recipe.portions }, quantity,
    }] : []),
  };
}

export function scorePlan(profit: number, optimum: number): number {
  if (profit <= 0 || optimum <= 0) return 0;
  if (profit >= optimum) return 3;
  return profit * 5 >= optimum * 4 ? 2 : 1;
}
