import { amounts, INGREDIENT_IDS, type Amounts, type NotebookRow, type Progress } from '../engine/types';

export const PROGRESS_KEY = 'pizza-economics.progress.v3';
const LEGACY_KEYS = ['pizza-economics.progress.v2', 'pizza-economics.progress.v1'];
export interface ProgressStore {
  load(): Progress;
  save(progress: Progress): boolean;
}
export const emptyProgress = (): Progress => ({ version: 3, balance: 0, levels: {}, notebooks: {}, seenFeatures: [] });
export const emptyNotebook = (): NotebookRow[] => [1,2,3].map(id => ({ id, pizzas: '', profit: '' }));

function readAmounts(value: unknown): Amounts | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  const source = value as Record<string, unknown>;
  if (!INGREDIENT_IDS.every(id => Number.isSafeInteger(source[id]) && (source[id] as number) >= 0)) return;
  return amounts(INGREDIENT_IDS.map(id => source[id] as number));
}

export function createProgressStore(storage: Pick<Storage, 'getItem' | 'setItem'> | undefined): ProgressStore {
  return {
    load() {
      try {
        const raw = storage?.getItem(PROGRESS_KEY) ?? LEGACY_KEYS.map(key => storage?.getItem(key)).find(Boolean);
        if (!raw) return emptyProgress();
        const parsed = JSON.parse(raw);
        if (![1,2,3].includes(parsed?.version) || !parsed.levels || typeof parsed.levels !== 'object' || Array.isArray(parsed.levels)) return emptyProgress();
        const progress = emptyProgress();
        for (const [key, value] of Object.entries(parsed.levels)) {
          const entry = value as { stars?: unknown; profit?: unknown };
          if (Number.isSafeInteger(Number(key)) && Number(key) >= 0 && entry
            && typeof entry.stars === 'number' && Number.isInteger(entry.stars) && entry.stars >= 0 && entry.stars <= 3
            && typeof entry.profit === 'number' && Number.isSafeInteger(entry.profit)) {
            progress.levels[Number(key)] = { stars: entry.stars, profit: entry.profit };
          }
        }
        // Старые результаты и деньги сохраняются, даже если запасов в сохранении ещё нет.
        progress.balance = Object.values(progress.levels).reduce((sum, level) => sum + Math.max(0, level.profit), 0);
        if (parsed.version >= 2) {
          if (Array.isArray(parsed.seenFeatures)) progress.seenFeatures = [...new Set(parsed.seenFeatures.filter((id: unknown): id is string => typeof id === 'string'))] as string[];
          if (Number.isSafeInteger(parsed.balance) && parsed.balance >= 0) progress.balance = parsed.balance;
          if (parsed.notebooks && typeof parsed.notebooks === 'object' && !Array.isArray(parsed.notebooks)) {
            for (const [key, value] of Object.entries(parsed.notebooks)) {
              if (!Number.isSafeInteger(Number(key)) || Number(key) < 0 || !Array.isArray(value)) continue;
              const ids = new Set<number>();
              const rows: NotebookRow[] = [];
              for (const row of value) {
                if (!row || !Number.isSafeInteger(row.id) || row.id < 1 || ids.has(row.id)
                  || typeof row.pizzas !== 'string' || typeof row.profit !== 'string') continue;
                ids.add(row.id);
                rows.push({ id: row.id, pizzas: row.pizzas, profit: row.profit.replace(/[^\d\n]/g, '') });
              }
              if (rows.length) progress.notebooks[Number(key)] = rows;
            }
          }
        }
        const round = parsed.version === 3 ? parsed.round : undefined;
        const carryover = readAmounts(round?.carryover);
        const delivery = readAmounts(round?.delivery);
        if (round && Number.isSafeInteger(round.levelId) && round.levelId >= 1 && carryover && delivery
          && INGREDIENT_IDS.every(id => Number.isSafeInteger(carryover[id] + delivery[id]))) {
          progress.round = { levelId: round.levelId, carryover, delivery, migrated: round.migrated === true };
          const remaining = readAmounts(round.best?.remaining);
          if (remaining && Number.isSafeInteger(round.best.profit) && Number.isInteger(round.best.stars)
            && round.best.stars >= 0 && round.best.stars <= 3
            && INGREDIENT_IDS.every(id => remaining[id] <= carryover[id] + delivery[id])) {
            progress.round.best = { profit: round.best.profit, stars: round.best.stars, remaining };
          }
        }
        return progress;
      } catch { return emptyProgress(); }
    },
    save(progress) {
      try {
        if (!storage) return false;
        storage.setItem(PROGRESS_KEY, JSON.stringify(progress));
        return true;
      } catch { return false; }
    },
  };
}
