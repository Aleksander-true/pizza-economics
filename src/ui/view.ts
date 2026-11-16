import { isLevelUnlocked, type GameController, type Snapshot } from '../app/controller';
import { INGREDIENTS, LEVELS } from '../data/levels';
import { evaluatePlan } from '../engine/economy';
import { SIZE_FACTORS, type Batch, type IngredientId, type PizzaSize } from '../engine/types';
import { icon, ingredientArt, pizzaArt, star } from './art';

const ingredientName = (id: IngredientId) => INGREDIENTS.find(item => item.id === id)!.name;
function coins(number: number): string {
  const n = Math.abs(number) % 100;
  return n >= 11 && n <= 14 ? 'монет' : n % 10 === 1 ? 'монета' : n % 10 >= 2 && n % 10 <= 4 ? 'монеты' : 'монет';
}
function stars(count: number): string {
  return `<span class="stars" aria-label="${count} из 3 звёзд">${[1,2,3].map(n => star(n <= count)).join('')}</span>`;
}
function header(snapshot: Snapshot): string {
  const inGame = snapshot.state.screen !== 'levels';
  const logo = { id: 0, size: 30 as PizzaSize, quantity: 1, portions: { dough: 1, sauce: 1, cheese: 1, olives: 0, sausage: 1, mushrooms: 0 } };
  return `<header class="app-header"><div class="brand-mark">${pizzaArt(logo)}</div><div><div class="brand">Экономические пиццы</div><div class="brand-caption">Маленькая пиццерия. Большие открытия.</div></div><div class="header-actions">${inGame ? `<span class="level-badge">Уровень ${snapshot.level.id} из ${LEVELS.length}</span><button class="button quiet" data-action="levels" data-focus="levels">${icon('grid')} Уровни</button>` : '<span class="level-badge">Учимся играя</span>'}</div></header>`;
}
function menu(snapshot: Snapshot): string {
  const { level } = snapshot;
  return `<section class="panel menu-panel" aria-label="Меню пицц"><h2 class="section-title">Меню</h2><table class="menu-table"><thead><tr><th scope="col">Пицца</th>${level.sizes.map(size => `<th scope="col">${size} см</th>`).join('')}</tr></thead><tbody>${level.recipes.map(recipe => `<tr><td>${recipe.name}</td>${level.sizes.map(size => `<td>${level.offers.find(offer => offer.recipeId === recipe.id && offer.size === size)!.price}</td>`).join('')}</tr>`).join('')}</tbody></table><button class="button recipes-button" data-action="recipes" data-focus="recipes">Рецепты ${icon('arrow')}</button></section>`;
}
function ingredientTiles(snapshot: Snapshot): string {
  return snapshot.level.ingredientIds.map(id => {
    const isDough = id === 'dough';
    const tag = isDough ? 'div' : 'button';
    return `<${tag} class="ingredient ${isDough ? '' : 'interactive'}" data-stock="${id}" ${isDough ? 'title="Количество теста зависит от размера пиццы"' : `data-action="add-ingredient" data-ingredient="${id}" data-drag-ingredient="${id}" data-focus="ingredient-${id}" aria-label="Добавить: ${ingredientName(id)} в выбранную партию"`}>
      ${ingredientArt(id)}<span class="ingredient-name">${ingredientName(id)}</span><span class="ingredient-stock"><b data-remaining></b> <small>из ${snapshot.level.stock[id]}</small></span><span class="ingredient-price"><b>${snapshot.level.costs[id]}</b> ${coins(snapshot.level.costs[id])} / порция</span><span class="ingredient-note" data-shortage></span></${tag}>`;
  }).join('');
}
function batchContent(batch: Batch, snapshot: Snapshot, index: number): string {
  const evaluation = snapshot.evaluation.batches.find(item => item.batchId === batch.id)!;
  const factor = SIZE_FACTORS[batch.size];
  const fits = snapshot.level.recipes.some(recipe => snapshot.level.ingredientIds.every(id => batch.portions[id] <= recipe.portions[id]));
  const name = evaluation.recipe?.name ?? (fits ? 'Заготовка' : 'Нет в меню');
  return `<button class="icon-button remove-batch" data-action="remove-batch" data-batch="${batch.id}" data-focus="remove-batch-${batch.id}" aria-label="Удалить партию ${index + 1}">${icon('trash')}</button>
  <div class="batch-body"><button class="pizza-select" data-action="select-batch" data-batch="${batch.id}" data-focus="select-${batch.id}" aria-label="Выбрать партию ${index + 1}: ${name}">${pizzaArt(batch)}<span class="pizza-caption">Место для начинки</span></button>
  <div class="batch-info"><p class="batch-label">Партия ${index + 1}</p><h3 class="batch-title">${name}</h3><div class="sizes" role="group" aria-label="Размер пиццы в партии ${index + 1}">${snapshot.level.sizes.map(size => `<button class="size-button" data-action="size" data-batch="${batch.id}" data-size="${size}" data-focus="size-${batch.id}-${size}" aria-pressed="${size === batch.size}">${size} см</button>`).join('')}</div>
  <div class="composition"><p class="composition-label">На одну пиццу</p><div class="composition-chips">${snapshot.level.ingredientIds.filter(id => batch.portions[id] > 0).map(id => `<span class="portion-chip">${ingredientName(id)} <b>${batch.portions[id] * factor}</b>${id !== 'dough' ? `<button data-action="remove-ingredient" data-batch="${batch.id}" data-ingredient="${id}" data-focus="remove-${batch.id}-${id}" aria-label="Убрать ${ingredientName(id).toLowerCase()} из партии ${index + 1}">−</button>` : ''}</span>`).join('')}</div></div>
  ${!evaluation.recipe ? `<p class="batch-empty-tip">${fits ? 'Добавь начинку сверху или загляни в рецепты.' : 'Такого состава нет в меню. Убери лишнюю начинку кнопкой «−».'}</p>` : ''}</div>
  <div class="batch-quantity"><p class="quantity-label">Количество</p><div class="stepper"><button data-action="quantity-minus" data-batch="${batch.id}" data-focus="minus-${batch.id}" aria-label="Уменьшить количество в партии ${index + 1}" ${batch.quantity === 0 ? 'disabled' : ''}>−</button><input type="number" min="0" max="999" inputmode="numeric" value="${batch.quantity}" data-quantity="${batch.id}" data-focus="quantity-${batch.id}" aria-label="Количество пицц в партии ${index + 1}"><button data-action="quantity-plus" data-batch="${batch.id}" data-focus="plus-${batch.id}" aria-label="Увеличить количество в партии ${index + 1}" ${batch.quantity === 999 ? 'disabled' : ''}>+</button></div>
  ${evaluation.recipe ? `<p class="batch-price">${evaluation.unitPrice} × ${batch.quantity} = ${evaluation.revenue}</p><p class="batch-cost">Выручка · ${coins(evaluation.revenue)}<br>Продукты: ${evaluation.cost}</p>` : '<p class="batch-unmatched">Рецепт пока<br>не найден</p>'}</div></div>`;
}

export function mountGame(root: HTMLElement, controller: GameController): void {
  let selectedBatchId = 1;
  let lastScreen = '';
  let recipeSize: PizzaSize = 15;
  let drag: { pointerId: number; ingredientId: IngredientId; startX: number; startY: number; source: HTMLElement; ghost?: HTMLElement; moved: boolean } | undefined;
  let ignoreIngredientClickUntil = 0;

  function render(snapshot: Snapshot): void {
    const focus = (document.activeElement as HTMLElement | null)?.dataset.focus;
    const { state, level, evaluation } = snapshot;
    if (!state.batches.some(batch => batch.id === selectedBatchId)) selectedBatchId = state.batches[0].id;
    const screenKey = `${state.screen}:${level.id}`;
    if (state.screen === 'levels') {
      const totalStars = LEVELS.reduce((sum, item) => sum + (state.progress.levels[item.id]?.stars ?? 0), 0);
      root.innerHTML = `<div class="app-shell">${header(snapshot)}<main><section class="levels-intro"><div><p class="eyebrow">Твоя первая пиццерия</p><h1>Вкусно готовить. Выгодно считать.</h1><p>Собирай пиццы из доступных продуктов, сравнивай планы и находи лучшую прибыль. Можно думать сколько угодно.</p></div>${pizzaArt({ id: 0, size: 30, quantity: 1, portions: { dough: 1, sauce: 1, cheese: 1, olives: 1, sausage: 0, mushrooms: 0 } })}</section><div class="section-heading"><h2 class="section-title">${LEVELS.length} маленьких открытий</h2><span class="section-meta">${totalStars} из ${LEVELS.length * 3} звёзд</span></div><div class="level-grid">${LEVELS.map(item => {
        const progress = state.progress.levels[item.id];
        const unlocked = isLevelUnlocked(state.progress, item.id);
        return `<button class="level-card" data-action="open-level" data-level="${item.id}" data-focus="level-${item.id}" ${unlocked ? '' : 'disabled'} aria-label="Уровень ${item.id}. ${item.title}. ${unlocked ? `${progress?.stars ?? 0} из 3 звёзд` : 'Сначала пройди предыдущий уровень'}"><div class="level-card-top"><span class="level-number">${item.id}</span>${unlocked ? stars(progress?.stars ?? 0) : icon('lock')}</div><h2>${item.title}</h2><small>${item.id === 7 ? 'Новый ингредиент: грибы' : progress ? `Лучшая прибыль: ${progress.profit}` : `${item.ingredientIds.length} продуктов · 2 размера`}</small></button>`;
      }).join('')}</div><footer class="level-footer"><span>Одна звезда открывает следующий уровень.<br>Три звезды — за самую большую прибыль.</span><span>Прогресс сохраняется на этом устройстве.</span></footer></main></div>`;
    } else if (state.screen === 'planning') {
      if (lastScreen !== screenKey) {
        selectedBatchId = state.batches[0].id;
        root.innerHTML = `<div class="app-shell">${header(snapshot)}<main class="workspace"><div class="main-column"><section class="panel ingredient-panel" aria-label="Доступные продукты"><div class="section-heading"><h2 class="section-title">Продукты <span class="section-meta">· осталось</span></h2><span class="section-meta">Перетащи или нажми</span></div><div class="ingredients" style="--ingredient-count:${level.ingredientIds.length}">${ingredientTiles(snapshot)}</div></section><section class="instruction"><span class="instruction-number">${level.id}</span><div><h2>${level.title}</h2><p>${level.lesson}</p><div id="hints"></div></div></section><section class="panel batch-area"><div class="section-heading"><h2 class="section-title">Твои пиццы</h2><span class="section-meta" id="selection-label"></span></div><div class="batch-list" id="batch-list"></div><button class="add-batch" data-action="add-batch" data-focus="add-batch">${icon('plus')} Добавить партию</button></section></div><aside class="sidebar">${menu(snapshot)}<section class="panel money-panel" aria-label="Расчёт прибыли"><p class="money-label">Твой план на раунд</p><div class="money-row"><span>Выручка</span><strong id="revenue"></strong></div><div class="money-row"><span>Продукты</span><strong id="cost"></strong></div><div class="profit-box"><span class="profit-title">Прибыль</span><div><div class="profit-value" id="profit"></div><div class="profit-unit" id="profit-unit"></div></div></div></section><button class="button primary cook-button" data-action="cook" data-focus="cook" aria-describedby="plan-issues">Приготовить ${icon('arrow')}</button><div class="plan-issues" id="plan-issues" role="status" aria-live="polite"></div><button class="button quiet hint-button" data-action="hint" data-focus="hint">${icon('bulb')} <span id="hint-label">Подсказка</span></button></aside></main><div class="compact-summary"><div><span>Прибыль</span><strong id="compact-profit"></strong></div><button class="button primary" data-action="cook" data-focus="compact-cook">Приготовить ${icon('arrow')}</button></div></div>`;
      }
      for (const id of level.ingredientIds) {
        const tile = root.querySelector<HTMLElement>(`[data-stock="${id}"]`)!;
        tile.classList.toggle('shortage', evaluation.remaining[id] < 0);
        tile.querySelector('[data-remaining]')!.textContent = String(Math.max(0, evaluation.remaining[id]));
        tile.querySelector('[data-shortage]')!.textContent = evaluation.remaining[id] < 0 ? `Не хватает ${-evaluation.remaining[id]}` : '';
      }
      const list = root.querySelector<HTMLElement>('#batch-list')!;
      const presentIds = new Set(state.batches.map(batch => String(batch.id)));
      for (const card of list.querySelectorAll<HTMLElement>('[data-pizza-slot]')) if (!presentIds.has(card.dataset.pizzaSlot!)) card.remove();
      state.batches.forEach((batch, index) => {
        let card = list.querySelector<HTMLElement>(`[data-pizza-slot="${batch.id}"]`);
        if (!card) { card = document.createElement('article'); card.className = 'batch'; card.dataset.pizzaSlot = String(batch.id); list.append(card); }
        const content = batchContent(batch, snapshot, index);
        // Оставляем DOM карточки на месте, пока её данные не изменились.
        if (card.dataset.content !== content) { card.innerHTML = content; card.dataset.content = content; }
        card.dataset.selected = String(batch.id === selectedBatchId);
        card.classList.toggle('is-inactive', batch.quantity === 0);
      });
      root.querySelector('#selection-label')!.textContent = `Выбрана партия ${state.batches.findIndex(batch => batch.id === selectedBatchId) + 1}`;
      root.querySelector('#revenue')!.textContent = String(evaluation.revenue);
      root.querySelector('#cost')!.textContent = String(evaluation.cost);
      root.querySelector('#profit')!.textContent = String(evaluation.profit);
      root.querySelector('#profit-unit')!.textContent = coins(evaluation.profit);
      root.querySelector('#compact-profit')!.textContent = `${evaluation.profit} ${coins(evaluation.profit)}`;
      for (const button of root.querySelectorAll<HTMLButtonElement>('[data-action="cook"]')) button.disabled = !evaluation.canCook;
      const issueBox = root.querySelector<HTMLElement>('#plan-issues')!;
      issueBox.classList.toggle('has-shortage', evaluation.issues.some(issue => issue.type === 'shortage'));
      issueBox.innerHTML = evaluation.canCook ? `<p class="plan-valid">${icon('check')} Всех продуктов хватает</p>` : `<ul>${evaluation.issues.map(issue => {
        if (issue.type === 'shortage') return `<li>${ingredientName(issue.ingredientId)}: не хватает ${issue.missing} порций.</li>`;
        if (issue.type === 'empty') return '<li>Добавь хотя бы одну пиццу.</li>';
        const index = state.batches.findIndex(batch => batch.id === issue.batchId) + 1;
        return `<li>Собери пиццу в партии ${index} по рецепту из меню.</li>`;
      }).join('')}</ul>`;
      root.querySelector('#hints')!.innerHTML = state.hintCount ? `<div class="hints">${level.hints.slice(0, state.hintCount).map(text => `<p>${text}</p>`).join('')}</div>` : '';
      root.querySelector('#hint-label')!.textContent = state.hintCount === 0 ? 'Подсказка' : state.hintCount < level.hints.length ? 'Ещё подсказка' : 'Все подсказки открыты';
      root.querySelector<HTMLButtonElement>('[data-action="hint"]')!.disabled = state.hintCount >= level.hints.length;
    } else {
      const result = state.result!;
      const difference = result.optimum - result.profit;
      const solution = evaluatePlan(level, snapshot.optimum.batches);
      root.innerHTML = `<div class="app-shell">${header(snapshot)}<main class="result-wrap"><section class="panel result-card"><div class="result-stars" aria-label="${result.stars} из 3 звёзд">${[1,2,3].map(n => star(n <= result.stars)).join('')}</div><h1>${result.stars === 3 ? 'Лучший план найден!' : result.stars > 0 ? 'Пиццерия заработала!' : 'Попробуем другой план?'}</h1><p class="result-subtitle">${result.stars === 3 ? 'Ты получил максимум из этой поставки.' : difference > 0 ? `Можно заработать ещё ${difference} ${coins(difference)}. Измени состав партий или размеры пицц.` : 'Для звезды нужна положительная прибыль.'}</p><div class="result-profit">${result.profit} <small>${coins(result.profit)} прибыли</small></div><p class="result-equation">Выручка ${result.revenue} − продукты ${result.cost} = прибыль ${result.profit}</p><div class="result-actions"><button class="button" data-action="retry" data-focus="retry">Изменить план</button><button class="button primary" data-action="next" data-focus="next" ${result.stars === 0 && level.id !== LEVELS.length ? 'disabled' : ''}>${level.id === LEVELS.length ? 'К уровням' : 'Следующий уровень'} ${icon('arrow')}</button></div><div class="solution-panel">${state.showSolution ? `<strong>Один из лучших планов · ${snapshot.optimum.profit} ${coins(snapshot.optimum.profit)}</strong><ul>${snapshot.optimum.batches.map(batch => `<li>${solution.batches.find(item => item.batchId === batch.id)!.recipe!.name}, ${batch.size} см — ${batch.quantity} шт.</li>`).join('')}</ul><p>Вернись к своему плану и попробуй собрать это сочетание.</p>` : '<button class="button quiet" data-action="solution" data-focus="solution">Посмотреть пример лучшего плана</button>'}</div>${state.storageWarning ? '<p class="storage-warning">Не удалось сохранить результат на устройстве. В этой вкладке прогресс сохранится до перезагрузки.</p>' : ''}</section><p class="screen-note">Любой план с максимальной прибылью получает три звезды.<br>Подсказки не уменьшают награду.</p></main></div>`;
    }
    lastScreen = screenKey;
    if (focus) root.querySelector<HTMLElement>(`[data-focus="${CSS.escape(focus)}"]`)?.focus({ preventScroll: true });
  }

  function selectBatch(id: number): void {
    if (!controller.getSnapshot().state.batches.some(batch => batch.id === id)) return;
    selectedBatchId = id;
    render(controller.getSnapshot());
  }
  function openRecipes(): void {
    const snapshot = controller.getSnapshot();
    recipeSize = snapshot.state.batches.find(batch => batch.id === selectedBatchId)?.size ?? 15;
    const dialog = document.createElement('dialog');
    dialog.className = 'recipe-drawer';
    dialog.setAttribute('aria-labelledby', 'recipe-title');
    root.append(dialog);
    function draw(): void {
      dialog.innerHTML = `<div class="drawer-heading"><h2 id="recipe-title">Книга рецептов</h2><button class="icon-button" data-close-recipes aria-label="Закрыть рецепты" autofocus>${icon('close')}</button></div><p class="drawer-intro">Здесь указан состав <strong>одной пиццы</strong>. Размер меняет расход каждого продукта.</p><div class="sizes" role="group" aria-label="Размер в книге рецептов">${snapshot.level.sizes.map(size => `<button class="size-button" data-recipe-size="${size}" aria-pressed="${recipeSize === size}">${size} см</button>`).join('')}</div>${snapshot.level.recipes.map(recipe => {
        const offer = snapshot.level.offers.find(item => item.recipeId === recipe.id && item.size === recipeSize)!;
        const factor = SIZE_FACTORS[recipeSize];
        const cost = snapshot.level.ingredientIds.reduce((sum, id) => sum + recipe.portions[id] * factor * snapshot.level.costs[id], 0);
        return `<section class="drawer-recipe"><h3>${recipe.name}</h3><div class="recipe-portions">${snapshot.level.ingredientIds.filter(id => recipe.portions[id]).map(id => `<span>${ingredientName(id)}</span><strong>${recipe.portions[id] * factor}</strong>`).join('')}</div><p class="recipe-price">Цена: <strong>${offer.price}</strong> · Продукты: <strong>${cost}</strong> · Прибыль: <strong>${offer.price - cost}</strong></p></section>`;
      }).join('')}<p class="drawer-tip">Одно нажатие на начинку добавляет ${SIZE_FACTORS[recipeSize]} ${SIZE_FACTORS[recipeSize] === 1 ? 'порцию' : 'порции'} для размера ${recipeSize} см. Повторное нажатие добавит ещё столько же.</p>`;
    }
    dialog.addEventListener('click', event => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-close-recipes]')) dialog.close();
      const size = target.closest<HTMLElement>('[data-recipe-size]');
      if (size) { recipeSize = Number(size.dataset.recipeSize) as PizzaSize; draw(); dialog.querySelector<HTMLButtonElement>(`[data-recipe-size="${recipeSize}"]`)?.focus(); }
      if (target === dialog) {
        const rect = dialog.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
      }
    });
    dialog.addEventListener('close', () => { dialog.remove(); root.querySelector<HTMLButtonElement>('[data-action="recipes"]')?.focus(); });
    draw(); dialog.showModal();
  }

  root.addEventListener('click', event => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!target || (target as HTMLButtonElement).disabled) return;
    const action = target.dataset.action;
    const batchId = Number(target.dataset.batch);
    const snapshot = controller.getSnapshot();
    const batch = snapshot.state.batches.find(item => item.id === batchId);
    if (action === 'open-level') controller.dispatch({ type: 'open-level', levelId: Number(target.dataset.level) });
    else if (action === 'levels') controller.dispatch({ type: 'show-levels' });
    else if (action === 'recipes') openRecipes();
    else if (action === 'select-batch') selectBatch(batchId);
    else if (action === 'add-batch') {
      controller.dispatch({ type: 'add-batch' });
      selectBatch(controller.getSnapshot().state.batches.at(-1)!.id);
      root.querySelector<HTMLElement>(`[data-pizza-slot="${selectedBatchId}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } else if (action === 'remove-batch') controller.dispatch({ type: 'remove-batch', batchId });
    else if (action === 'add-ingredient') {
      if (performance.now() < ignoreIngredientClickUntil) return;
      controller.dispatch({ type: 'ingredient', batchId: selectedBatchId, ingredientId: target.dataset.ingredient as IngredientId, delta: 1 });
    } else if (action === 'remove-ingredient') {
      selectedBatchId = batchId;
      controller.dispatch({ type: 'ingredient', batchId, ingredientId: target.dataset.ingredient as IngredientId, delta: -1 });
    } else if (action === 'size') {
      selectedBatchId = batchId;
      controller.dispatch({ type: 'set-size', batchId, size: Number(target.dataset.size) as PizzaSize });
    } else if (action === 'quantity-plus' || action === 'quantity-minus') {
      if (batch) controller.dispatch({ type: 'set-quantity', batchId, quantity: batch.quantity + (action === 'quantity-plus' ? 1 : -1) });
    } else if (action === 'cook') controller.dispatch({ type: 'cook' });
    else if (action === 'hint') controller.dispatch({ type: 'hint' });
    else if (action === 'retry') controller.dispatch({ type: 'retry' });
    else if (action === 'next') controller.dispatch({ type: 'next-level' });
    else if (action === 'solution') controller.dispatch({ type: 'show-solution' });
  });
  root.addEventListener('change', event => {
    const input = event.target as HTMLInputElement;
    if (!input.matches('[data-quantity]')) return;
    const quantity = input.value === '' ? NaN : Number(input.value);
    controller.dispatch({ type: 'set-quantity', batchId: Number(input.dataset.quantity), quantity });
    const batch = controller.getSnapshot().state.batches.find(item => item.id === Number(input.dataset.quantity));
    if (batch) input.value = String(batch.quantity);
  });

  function clearDrag(): void {
    if (drag?.source.hasPointerCapture(drag.pointerId)) drag.source.releasePointerCapture(drag.pointerId);
    drag?.ghost?.remove();
    drag = undefined;
    root.querySelectorAll('.drop-target').forEach(element => element.classList.remove('drop-target'));
  }
  root.addEventListener('pointerdown', event => {
    if (event.button !== 0 || controller.getSnapshot().state.screen !== 'planning') return;
    const source = (event.target as HTMLElement).closest<HTMLElement>('[data-drag-ingredient]');
    if (!source) return;
    drag = { pointerId: event.pointerId, ingredientId: source.dataset.dragIngredient as IngredientId, source, startX: event.clientX, startY: event.clientY, moved: false };
    source.setPointerCapture(event.pointerId);
  });
  root.addEventListener('pointermove', event => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 8) return;
    if (!drag.moved) {
      drag.moved = true;
      drag.ghost = document.createElement('div'); drag.ghost.className = 'drag-ghost';
      drag.ghost.innerHTML = ingredientArt(drag.ingredientId);
      document.body.append(drag.ghost);
    }
    drag.ghost!.style.transform = `translate(${event.clientX - 37}px, ${event.clientY - 37}px)`;
    const hovered = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-pizza-slot]');
    root.querySelectorAll('[data-pizza-slot]').forEach(card => card.classList.toggle('drop-target', card === hovered));
  });
  root.addEventListener('pointerup', event => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const current = drag;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-pizza-slot]');
    clearDrag();
    if (!current.moved) return;
    ignoreIngredientClickUntil = performance.now() + 250;
    event.preventDefault();
    if (target) {
      selectedBatchId = Number(target.dataset.pizzaSlot);
      controller.dispatch({ type: 'ingredient', batchId: selectedBatchId, ingredientId: current.ingredientId, delta: 1 });
    }
  });
  root.addEventListener('pointercancel', clearDrag);
  window.addEventListener('blur', clearDrag);
  controller.subscribe(render);
  render(controller.getSnapshot());
}
