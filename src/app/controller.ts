import { createBatch, evaluatePlan, findOptimalPlan, scorePlan } from '../engine/economy';
import type { Batch, IngredientId, Level, OptimalPlan, PizzaSize, PlanEvaluation, Progress, RoundResult } from '../engine/types';
import type { ProgressStore } from '../storage/progress';

export interface GameState {
  screen: 'levels' | 'planning' | 'result';
  levelId: number;
  batches: Batch[];
  progress: Progress;
  result?: RoundResult;
  hintCount: number;
  showSolution: boolean;
  storageWarning: boolean;
}
export type GameAction =
  | { type: 'open-level'; levelId: number }
  | { type: 'show-levels' | 'add-batch' | 'cook' | 'retry' | 'next-level' | 'hint' | 'show-solution' }
  | { type: 'remove-batch'; batchId: number }
  | { type: 'set-size'; batchId: number; size: PizzaSize }
  | { type: 'set-quantity'; batchId: number; quantity: number }
  | { type: 'ingredient'; batchId: number; ingredientId: IngredientId; delta: 1 | -1 };
export interface Snapshot {
  state: GameState;
  level: Level;
  evaluation: PlanEvaluation;
  optimum: OptimalPlan;
}

export function isLevelUnlocked(progress: Progress, levelId: number): boolean {
  return levelId === 1 || (progress.levels[levelId - 1]?.stars ?? 0) >= 1;
}

export function createController(levels: readonly Level[], store: ProgressStore) {
  const listeners = new Set<(snapshot: Snapshot) => void>();
  const optima = new Map<number, OptimalPlan>();
  let nextBatchId = 2;
  let state: GameState = {
    screen: 'levels', levelId: levels[0].id, batches: [createBatch(1)],
    progress: store.load(), hintCount: 0, showSolution: false, storageWarning: false,
  };
  function getSnapshot(): Snapshot {
    const level = levels.find(item => item.id === state.levelId)!;
    let optimum = optima.get(level.id);
    if (!optimum) { optimum = findOptimalPlan(level); optima.set(level.id, optimum); }
    return { state, level, evaluation: evaluatePlan(level, state.batches), optimum };
  }
  function openLevel(levelId: number) {
    if (!levels.some(level => level.id === levelId) || !isLevelUnlocked(state.progress, levelId)) return;
    nextBatchId = 2;
    state = { ...state, screen: 'planning', levelId, batches: [createBatch(1)], result: undefined, hintCount: 0, showSolution: false };
  }
  function dispatch(action: GameAction): void {
    const { level, evaluation, optimum } = getSnapshot();
    if (action.type === 'open-level') openLevel(action.levelId);
    else if (action.type === 'show-levels') state = { ...state, screen: 'levels' };
    else if (action.type === 'retry' && state.screen === 'result') state = { ...state, screen: 'planning', result: undefined, showSolution: false };
    else if (action.type === 'next-level' && state.screen === 'result') {
      const next = levels[levels.findIndex(item => item.id === level.id) + 1];
      if (next && (state.result?.stars ?? 0) >= 1) openLevel(next.id);
      else if (!next) state = { ...state, screen: 'levels' };
    } else if (action.type === 'show-solution' && state.screen === 'result') state = { ...state, showSolution: true };
    else if (state.screen === 'planning') {
      if (action.type === 'add-batch') state = { ...state, batches: [...state.batches, createBatch(nextBatchId++)] };
      else if (action.type === 'remove-batch') {
        const batches = state.batches.filter(batch => batch.id !== action.batchId);
        state = { ...state, batches: batches.length ? batches : [createBatch(nextBatchId++)] };
      } else if (action.type === 'set-quantity' && Number.isSafeInteger(action.quantity) && action.quantity >= 0 && action.quantity <= 999) {
        state = { ...state, batches: state.batches.map(batch => batch.id === action.batchId ? { ...batch, quantity: action.quantity } : batch) };
      } else if (action.type === 'set-size' && level.sizes.includes(action.size)) {
        state = { ...state, batches: state.batches.map(batch => batch.id === action.batchId ? { ...batch, size: action.size } : batch) };
      } else if (action.type === 'ingredient' && action.ingredientId !== 'dough' && level.ingredientIds.includes(action.ingredientId)) {
        state = { ...state, batches: state.batches.map(batch => batch.id === action.batchId ? {
          ...batch, portions: { ...batch.portions, [action.ingredientId]: Math.max(0, Math.min(99, batch.portions[action.ingredientId] + action.delta)) },
        } : batch) };
      } else if (action.type === 'hint') state = { ...state, hintCount: Math.min(state.hintCount + 1, level.hints.length) };
      else if (action.type === 'cook' && evaluation.canCook) {
        const stars = scorePlan(evaluation.profit, optimum.profit);
        const previous = state.progress.levels[level.id];
        const progress: Progress = { version: 1, levels: { ...state.progress.levels, [level.id]: {
          stars: Math.max(stars, previous?.stars ?? 0), profit: Math.max(evaluation.profit, previous?.profit ?? -Infinity),
        } } };
        const saved = store.save(progress);
        state = { ...state, screen: 'result', progress, storageWarning: !saved, result: {
          profit: evaluation.profit, optimum: optimum.profit, stars, cost: evaluation.cost, revenue: evaluation.revenue,
        } };
      }
    }
    const snapshot = getSnapshot();
    for (const listener of listeners) listener(snapshot);
  }
  return {
    getSnapshot, dispatch,
    subscribe(listener: (snapshot: Snapshot) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
export type GameController = ReturnType<typeof createController>;
