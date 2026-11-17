export const CAREER_RANKS = [
  { id: 'trainee', name: 'Стажёр', fromDay: 1, description: 'Пиццы 15 см' },
  { id: 'assistant', name: 'Помощник', fromDay: 3, description: 'Пиццы 30 см' },
  { id: 'junior-baker', name: 'Младший пекарь', fromDay: 4, description: 'Больше рецептов и сложнее поставки' },
  { id: 'baker', name: 'Пекарь', fromDay: 13, description: 'Следующий этап · после 12-го дня' },
  { id: 'junior-manager', name: 'Младший управляющий', fromDay: Infinity, description: 'Впереди' },
  { id: 'manager', name: 'Управляющий', fromDay: Infinity, description: 'Впереди' },
] as const;

export function careerRank(day: number) {
  return [...CAREER_RANKS].reverse().find(rank => day >= rank.fromDay) ?? CAREER_RANKS[0];
}
