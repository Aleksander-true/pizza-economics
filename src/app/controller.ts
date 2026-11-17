import { createBatch, evaluatePlan, findOptimalPlan, scorePlan } from '../engine/economy';
import { amounts, INGREDIENT_IDS, SIZE_FACTORS } from '../engine/types';
import { createRound, prepareLevel } from '../engine/inventory';
import type { Batch, IngredientId, Level, LevelDefinition, NotebookRow, OptimalPlan, PizzaSize, PlanEvaluation, Progress, RoundResult } from '../engine/types';
import { emptyNotebook, emptyProgress, type ProgressStore } from '../storage/progress';
import { INTRODUCTIONS, notebookExamples, type IntroductionId } from './introductions';

export interface GameState {
  screen: 'levels' | 'planning' | 'result';
  levelId: number;
  batches: Batch[];
  progress: Progress;
  result?: RoundResult;
  hintCount: number;
  hintCost: number;
  profitHint?: number;
  storageWarning: boolean;
  introductions: IntroductionId[];
}
export type GameAction =
  | { type: 'open-level'; levelId: number }
  | { type: 'show-levels' | 'add-batch' | 'cook' | 'retry' | 'next-level' | 'hint' | 'calculate-profit' | 'add-note' | 'reset-progress' }
  | { type: 'dismiss-introduction'; id: IntroductionId }
  | { type: 'update-note'; rowId: number; field: 'pizzas' | 'profit'; value: string }
  | { type: 'remove-batch'; batchId: number }
  | { type: 'set-size'; batchId: number; size: PizzaSize }
  | { type: 'set-quantity'; batchId: number; quantity: number }
  | { type: 'ingredient'; batchId: number; ingredientId: IngredientId; delta: 1 | -1 };
export interface Snapshot {
  state: GameState;
  level: Level;
  evaluation: PlanEvaluation;
  optimum: OptimalPlan;
  notebook: NotebookRow[];
}

export function isLevelUnlocked(progress: Progress, levelId: number): boolean {
  const current = progress.round?.levelId ?? 1;
  return levelId === current || (levelId === current + 1 && (progress.round?.best?.stars ?? 0) >= 1);
}

export function createController(levels: readonly LevelDefinition[], store: ProgressStore) {
  const listeners = new Set<(snapshot: Snapshot) => void>();
  const optima = new Map<string, OptimalPlan>();
  const loaded = store.load();
  const savedLevel = levels.find(level => level.id === loaded.round?.levelId);
  const currentLevel = savedLevel ?? [...levels].reverse().find(level => loaded.levels[level.id]) ?? levels[0];
  const progress = savedLevel ? loaded : { ...loaded, round: {
    ...createRound(currentLevel), migrated: Object.keys(loaded.levels).some(id => Number(id) >= 1),
  } };
  let nextBatchId = 2;
  let state: GameState = {
    screen: 'levels', levelId: currentLevel.id, batches: [createBatch(1)],
    progress, hintCount: 0, hintCost: 0, storageWarning: false, introductions: [],
  };
  function getSnapshot(): Snapshot {
    const definition = levels.find(item => item.id === state.levelId)!;
    const level = prepareLevel(definition, state.progress.round!);
    const key = `${level.id}:${INGREDIENT_IDS.map(id => level.stock[id]).join(',')}`;
    let optimum = optima.get(key);
    if (!optimum) { optimum = findOptimalPlan(level); optima.set(key, optimum); }
    return { state, level, evaluation: evaluatePlan(level, state.batches), optimum, notebook: state.progress.notebooks[level.id] ?? emptyNotebook() };
  }
  function openLevel(levelId: number) {
    const definition = levels.find(level => level.id === levelId);
    if (!definition || !isLevelUnlocked(state.progress, levelId)) return false;
    const round = state.progress.round!;
    if (levelId !== round.levelId) {
      persist({ ...state.progress, round: createRound(definition, round.best!.remaining) });
    }
    nextBatchId = 2;
    state = { ...state, screen: 'planning', levelId, batches: [createBatch(1)], result: undefined,
      hintCount: 0, hintCost: 0, profitHint: undefined,
      introductions: INTRODUCTIONS.filter(intro => intro.fromDay <= levelId && !state.progress.seenFeatures.includes(intro.id)).map(intro => intro.id) };
    const notes = state.progress.notebooks[levelId];
    // Заменяем только нетронутый старый автопример, сохраняя пользовательские записи.
    const hasLegacyExample = levelId >= 3 && notes?.length === 3 && notes[0].id === 1 && notes[0].profit === '8'
      && notes[0].pizzas === '2 сырные пиццы 15 см\nВыручка: 2 × 7 = 14\nПродукты: 2 × 3 = 6\nПрибыль: 14 − 6 = 8'
      && notes.slice(1).every((row, index) => row.id === index + 2 && !row.pizzas && !row.profit);
    if (hasLegacyExample || (state.introductions.includes('notebook') && !notes?.some(row => row.pizzas || row.profit))) {
      const level = prepareLevel(definition, state.progress.round!);
      const examples = notebookExamples(level);
      persist({ ...state.progress, notebooks: { ...state.progress.notebooks, [levelId]: [...examples, ...emptyNotebook().slice(examples.length)] } });
    }
    return true;
  }
  function persist(progress: Progress): void {
    state = { ...state, progress, storageWarning: !store.save(progress) };
  }
  function dispatch(action: GameAction): boolean {
    const { level, evaluation, optimum, notebook } = getSnapshot();
    const previousBatches = state.batches;
    if (action.type === 'reset-progress') {
      const progress = { ...emptyProgress(), round: createRound(levels[0]) };
      // Сначала сохраняем сброс: при ошибке прежняя игра остаётся доступной.
      if (!store.save(progress)) return false;
      state = { ...state, progress, storageWarning: false };
      openLevel(1);
    } else if (action.type === 'dismiss-introduction' && state.introductions[0] === action.id) {
      persist({ ...state.progress, seenFeatures: [...new Set([...state.progress.seenFeatures, action.id])] });
      state = { ...state, introductions: state.introductions.slice(1) };
    } else if (action.type === 'open-level') {
      if (!openLevel(action.levelId)) return false;
    } else if (action.type === 'show-levels') state = { ...state, screen: 'levels', introductions: [] };
    else if (action.type === 'retry' && state.screen === 'result') state = { ...state, screen: 'planning', result: undefined, hintCount: 0, hintCost: 0, profitHint: undefined };
    else if (action.type === 'next-level' && state.screen === 'result') {
      const next = levels[levels.findIndex(item => item.id === level.id) + 1];
      if (next && isLevelUnlocked(state.progress, next.id)) openLevel(next.id);
      else if (!next) state = { ...state, screen: 'levels', introductions: [] };
    } else if (state.screen === 'planning') {
      if (action.type === 'add-batch') state = { ...state, batches: [...state.batches, createBatch(nextBatchId++)] };
      else if (action.type === 'remove-batch') {
        const batches = state.batches.filter(batch => batch.id !== action.batchId);
        state = { ...state, batches: batches.length ? batches : [createBatch(nextBatchId++)] };
      } else if (action.type === 'set-quantity' && Number.isSafeInteger(action.quantity) && action.quantity >= 0 && action.quantity <= 999) {
        if (state.batches.some(batch => batch.id === action.batchId && batch.quantity !== action.quantity)) {
          state = { ...state, batches: state.batches.map(batch => batch.id === action.batchId ? { ...batch, quantity: action.quantity } : batch) };
        }
      } else if (action.type === 'set-size' && level.sizes.includes(action.size)) {
        if (state.batches.some(batch => batch.id === action.batchId && batch.size !== action.size)) {
          state = { ...state, batches: state.batches.map(batch => batch.id === action.batchId ? {
            ...batch, size: action.size,
            portions: amounts(INGREDIENT_IDS.map(id => Math.round(batch.portions[id] * SIZE_FACTORS[action.size] / SIZE_FACTORS[batch.size]))),
          } : batch) };
        }
      } else if (action.type === 'ingredient' && action.ingredientId !== 'dough' && level.ingredientIds.includes(action.ingredientId)) {
        state = { ...state, batches: state.batches.map(batch => batch.id === action.batchId ? {
          ...batch, portions: { ...batch.portions, [action.ingredientId]: Math.max(0, Math.min(99, batch.portions[action.ingredientId] + action.delta)) },
        } : batch) };
      } else if (action.type === 'update-note' && notebook.some(row => row.id === action.rowId)) {
        const value = action.field === 'profit' ? action.value.replace(/[^\d\n]/g, '') : action.value;
        const rows = notebook.map(row => row.id === action.rowId ? { ...row, [action.field]: value } : row);
        persist({ ...state.progress, notebooks: { ...state.progress.notebooks, [level.id]: rows } });
      } else if (action.type === 'add-note') {
        const rows = [...notebook, { id: Math.max(...notebook.map(row => row.id)) + 1, pizzas: '', profit: '' }];
        persist({ ...state.progress, notebooks: { ...state.progress.notebooks, [level.id]: rows } });
      } else if (action.type === 'hint' && state.hintCount < level.hints.length) {
        state = { ...state, hintCount: state.hintCount + 1, hintCost: state.hintCost + 1 };
      } else if (action.type === 'calculate-profit' && evaluation.canCook && state.profitHint === undefined) {
        state = { ...state, profitHint: evaluation.profit, hintCost: state.hintCost + 1 };
      } else if (action.type === 'cook' && evaluation.canCook) {
        const profit = evaluation.profit - state.hintCost;
        const stars = scorePlan(profit, optimum.profit);
        const previous = state.progress.levels[level.id];
        const previousBest = Math.max(0, previous?.profit ?? 0);
        const awarded = Math.max(0, profit - previousBest);
        const round = state.progress.round!;
        const improved = !round.best || profit > round.best.profit;
        const best = improved ? { profit, stars, remaining: { ...evaluation.remaining } } : round.best!;
        // Деньги и остатки фиксируются одной записью; худший повтор не меняет запас для завтра.
        const progress: Progress = { ...state.progress, round: { ...round, best }, balance: state.progress.balance + awarded, levels: { ...state.progress.levels, [level.id]: {
          stars: Math.max(stars, previous?.stars ?? 0), profit: Math.max(profit, previous?.profit ?? -Infinity),
        } } };
        persist(progress);
        state = { ...state, screen: 'result', result: {
          profit, grossProfit: evaluation.profit, hintCost: state.hintCost, awarded, previousBest,
          carryover: { ...best.remaining }, keptBest: !improved,
          optimum: optimum.profit, stars, cost: evaluation.cost, revenue: evaluation.revenue,
        } };
      }
    }
    if (state.batches !== previousBatches) state = { ...state, profitHint: undefined };
    const snapshot = getSnapshot();
    for (const listener of listeners) listener(snapshot);
    return true;
  }
  if (!savedLevel) persist(progress);
  if (!Object.keys(state.progress.levels).some(id => Number(id) >= 1) && !state.progress.seenFeatures.includes('goal')) openLevel(1);
  return {
    getSnapshot, dispatch,
    subscribe(listener: (snapshot: Snapshot) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
export type GameController = ReturnType<typeof createController>;
