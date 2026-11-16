import { SIZE_FACTORS, type Batch, type IngredientId } from '../engine/types';

const symbols = {
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 10v7m4-7v7"/>',
  bulb: '<path d="M9 18h6m-5 3h4M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 2H9s0-1-1-2Z"/>',
  grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  lock: '<rect x="6" y="10" width="12" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
};
export function icon(name: keyof typeof symbols): string {
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${symbols[name]}</svg>`;
}
export function star(filled: boolean): string {
  return `<svg class="star ${filled ? 'filled' : ''}" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.5 2.9 6 6.6.9-4.8 4.7 1.1 6.6-5.8-3.1-5.8 3.1 1.1-6.6L2.5 9.4l6.6-.9Z"/></svg>`;
}
const foods: Record<IngredientId, string> = {
  dough: '<ellipse cx="40" cy="55" rx="31" ry="11" fill="#ead8b4"/><path d="M10 47c0-18 14-32 30-32s30 14 30 32c0 16-60 16-60 0" fill="#f7e4b9" stroke="#d4ac6e" stroke-width="2"/><path d="M23 29c4-5 9-7 15-7" fill="none" stroke="#fff5db" stroke-width="6" stroke-linecap="round"/>',
  sauce: '<path d="M9 34h62c-2 27-17 35-31 35S11 61 9 34" fill="#e8edf4" stroke="#c5ccd8" stroke-width="2"/><ellipse cx="40" cy="34" rx="32" ry="17" fill="#fff" stroke="#c5ccd8" stroke-width="2"/><ellipse cx="40" cy="34" rx="26" ry="12" fill="#d65a3b"/><path d="M22 34c0-9 35-9 35 0 0 7-24 7-24 1 0-3 10-3 10 0" fill="none" stroke="#a83d2c" stroke-width="3" stroke-linecap="round"/>',
  cheese: '<path d="m10 34 41-21 20 20-1 30-60-7Z" fill="#ffcf59" stroke="#e7aa30" stroke-width="2"/><path d="m10 34 41-21 20 20-32 5Z" fill="#ffe69a"/><path d="M39 38v22" stroke="#e7aa30" stroke-width="2"/><ellipse cx="50" cy="26" rx="6" ry="3" fill="#edb536"/><ellipse cx="22" cy="44" rx="5" ry="7" fill="#eeb12c"/><ellipse cx="54" cy="47" rx="6" ry="7" fill="#eeb12c"/>',
  olives: '<g fill="#45483c" stroke="#272f28" stroke-width="2"><ellipse cx="25" cy="27" rx="15" ry="11" transform="rotate(-25 25 27)"/><ellipse cx="55" cy="38" rx="15" ry="11" transform="rotate(25 55 38)"/><ellipse cx="29" cy="58" rx="15" ry="11" transform="rotate(15 29 58)"/></g><g fill="#faf5df"><ellipse cx="25" cy="27" rx="6" ry="4" transform="rotate(-25 25 27)"/><ellipse cx="55" cy="38" rx="6" ry="4" transform="rotate(25 55 38)"/><ellipse cx="29" cy="58" rx="6" ry="4" transform="rotate(15 29 58)"/></g>',
  sausage: '<path d="m16 41 28-26c8-7 32 15 25 23L43 63" fill="#c84f49" stroke="#b43d39" stroke-width="2"/><ellipse cx="29" cy="51" rx="20" ry="16" transform="rotate(35 29 51)" fill="#ed8b80" stroke="#b43d39" stroke-width="3"/><g fill="#ffd0bb"><circle cx="22" cy="44" r="4"/><circle cx="36" cy="50" r="3"/><circle cx="25" cy="58" r="3"/><circle cx="44" cy="28" r="3"/><circle cx="56" cy="33" r="3"/></g>',
  mushrooms: '<path d="m29 39-5 26c0 7 31 7 31 0l-6-26" fill="#f1dfc3" stroke="#b88e69" stroke-width="2"/><path d="M9 41C9 3 70 3 71 41c-15 10-47 10-62 0" fill="#b88a64" stroke="#8c654a" stroke-width="2"/><path d="M22 28c3-6 9-9 16-9" fill="none" stroke="#d4ae88" stroke-width="5" stroke-linecap="round"/>',
};
export function ingredientArt(id: IngredientId): string {
  return `<svg class="food-art" viewBox="0 0 80 80" aria-hidden="true">${foods[id]}</svg>`;
}
export function pizzaArt(batch: Batch): string {
  const factor = SIZE_FACTORS[batch.size];
  const r = batch.size === 15 ? 49 : batch.size === 30 ? 98 : 105;
  const base = `<circle cx="110" cy="114" r="${r + 4}" fill="#e4d5bd" opacity=".35"/><circle cx="110" cy="110" r="${r}" fill="#efbb67" stroke="#cb8e3e" stroke-width="2"/><circle cx="110" cy="110" r="${r - 8}" fill="#f9dda0"/>`;
  let topping = batch.portions.sauce > 0 ? `<circle cx="110" cy="110" r="${r - 9}" fill="#d76543"/>` : '';
  if (batch.portions.cheese > 0) topping += `<circle cx="110" cy="110" r="${r - 14}" fill="#ffdd78"/>`;
  if (batch.portions.cheese > 0) {
    for (let i = 0; i < Math.min(24, 7 * Math.sqrt(factor) * batch.portions.cheese); i++) {
      const angle = i * 2.4, distance = Math.sqrt((i + 1) / 28) * (r - 20);
      const x = 110 + Math.cos(angle) * distance, y = 110 + Math.sin(angle) * distance;
      topping += `<path d="M${x - 3} ${y - 2}l6 4" stroke="#f6c052" stroke-width="4" stroke-linecap="round"/>`;
    }
  }
  (['olives', 'sausage', 'mushrooms'] as const).forEach((id, layer) => {
    const count = Math.min(28, batch.portions[id] * (batch.size === 15 ? 5 : 13));
    for (let i = 0; i < count; i++) {
      const angle = i * 2.4 + layer * .7, distance = Math.sqrt((i + .5) / count) * (r - 24);
      const x = 110 + Math.cos(angle) * distance, y = 110 + Math.sin(angle) * distance;
      if (id === 'olives') topping += `<circle cx="${x}" cy="${y}" r="6.5" fill="none" stroke="#354037" stroke-width="4"/>`;
      if (id === 'sausage') topping += `<circle cx="${x}" cy="${y}" r="10" fill="#da6e5d" stroke="#ba4a3d" stroke-width="1.5"/><circle cx="${x - 3}" cy="${y - 3}" r="2.5" fill="#f7c3a0"/><circle cx="${x + 4}" cy="${y + 2}" r="2" fill="#f7c3a0"/>`;
      if (id === 'mushrooms') topping += `<path d="M${x - 3} ${y}v9h6v-9" fill="#ead6b5"/><path d="M${x - 11} ${y + 2}a11 10 0 0 1 22 0Z" fill="#ad805a" stroke="#856042"/>`;
    }
  });
  return `<svg class="pizza-art" viewBox="0 0 220 220" aria-hidden="true">${base}${topping}</svg>`;
}
