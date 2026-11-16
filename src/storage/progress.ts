import type { Progress } from '../engine/types';

export const PROGRESS_KEY = 'pizza-economics.progress.v1';
export interface ProgressStore {
  load(): Progress;
  save(progress: Progress): boolean;
}
export const emptyProgress = (): Progress => ({ version: 1, levels: {} });

export function createProgressStore(storage: Pick<Storage, 'getItem' | 'setItem'> | undefined): ProgressStore {
  return {
    load() {
      try {
        const raw = storage?.getItem(PROGRESS_KEY);
        if (!raw) return emptyProgress();
        const parsed = JSON.parse(raw);
        if (parsed?.version !== 1 || !parsed.levels || typeof parsed.levels !== 'object' || Array.isArray(parsed.levels)) return emptyProgress();
        const progress = emptyProgress();
        for (const [key, value] of Object.entries(parsed.levels)) {
          const entry = value as { stars?: unknown; profit?: unknown };
          if (Number.isSafeInteger(Number(key)) && Number(key) > 0 && entry
            && typeof entry.stars === 'number' && Number.isInteger(entry.stars) && entry.stars >= 0 && entry.stars <= 3
            && typeof entry.profit === 'number' && Number.isSafeInteger(entry.profit)) {
            progress.levels[Number(key)] = { stars: entry.stars, profit: entry.profit };
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
