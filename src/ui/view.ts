import { isLevelUnlocked, type GameController, type Snapshot } from '../app/controller';
import { INGREDIENTS, LEVELS } from '../data/levels';
import { SIZE_FACTORS, type Batch, type IngredientId, type PizzaSize } from '../engine/types';
import { icon, ingredientArt, pizzaArt, star } from './art';
import { createIntroductionGuide } from './introductions';
import { careerRank } from '../data/career';
import { notebookMarkup, sizeNotebook, updateNotebook } from './notebook';

const ingredientName = (id: IngredientId) => INGREDIENTS.find(item => item.id === id)!.name;
function coins(number: number): string {
  const n = Math.abs(number) % 100;
  return n >= 11 && n <= 14 ? 'монет' : n % 10 === 1 ? 'монета' : n % 10 >= 2 && n % 10 <= 4 ? 'монеты' : 'монет';
}
function stars(count: number): string {
  return `<span class="stars" aria-label="${count} из 3 звёзд">${[1,2,3].map(n => star(n <= count)).join('')}</span>`;
}
function currentRank(snapshot: Snapshot) {
  const day = Math.max(...LEVELS.filter(level => isLevelUnlocked(snapshot.state.progress, level.id)).map(level => level.id));
  return careerRank(day);
}
function header(snapshot: Snapshot): string {
  const inGame = snapshot.state.screen !== 'levels';
  const logo = { id: 0, size: 30 as PizzaSize, quantity: 1, portions: { dough: 4, sauce: 4, cheese: 4, olives: 0, sausage: 4, mushrooms: 0 } };
  return `<header class="app-header${inGame ? ' in-game' : ''}"><button class="brand-home" data-action="home" data-focus="home" aria-label="Пекарь магнат — главное меню"><span class="brand-mark">${pizzaArt(logo, 'logo')}</span><span><span class="brand">Пекарь магнат</span><span class="brand-caption">Первый миллион на тесте</span></span></button>${inGame ? `<p class="current-rank">${currentRank(snapshot).name}</p>` : ''}<div class="header-actions">${snapshot.state.screen === 'planning' ? notebookMarkup(snapshot.level.id) : ''}<span class="balance-badge"><small>Общий счёт</small><strong data-balance>${snapshot.state.progress.balance}</strong><span>₵</span></span><button class="icon-button menu-toggle" data-action="game-menu" data-focus="game-menu" popovertarget="game-menu" aria-label="Меню игры">${icon('menu')}</button><div id="game-menu" class="game-menu panel" popover aria-label="Меню игры"><p class="section-meta">Игра</p><button class="menu-item" data-action="levels" data-focus="levels">${icon('grid')} Уровни</button><button class="menu-reset" data-action="request-reset">${icon('trash')} Сбросить прогресс</button></div></div></header>`;
}
function menu(snapshot: Snapshot): string {
  const { level } = snapshot;
  return `<section class="panel menu-panel" aria-label="Меню пицц"><h2 class="section-title">Меню</h2><table class="menu-table"><thead><tr><th scope="col">Пицца</th>${level.sizes.map(size => `<th scope="col">${size} см</th>`).join('')}</tr></thead><tbody>${level.recipes.map(recipe => `<tr><td>${recipe.name}</td>${level.sizes.map(size => `<td>${level.offers.find(offer => offer.recipeId === recipe.id && offer.size === size)!.price}&nbsp;₵</td>`).join('')}</tr>`).join('')}</tbody></table><button class="button recipes-button" data-action="recipes" data-focus="recipes">Рецепты ${icon('arrow')}</button></section>`;
}
function ingredientTiles(snapshot: Snapshot): string {
  return snapshot.level.ingredientIds.map(id => {
    const isDough = id === 'dough';
    const tag = isDough ? 'div' : 'button';
    return `<${tag} class="ingredient ${isDough ? '' : 'interactive'}" data-stock="${id}" ${isDough ? 'title="Количество теста зависит от размера пиццы"' : `data-action="add-ingredient" data-ingredient="${id}" data-drag-ingredient="${id}" data-focus="ingredient-${id}" aria-label="Добавить: ${ingredientName(id)} в выбранную партию"`}>
      ${ingredientArt(id)}<span class="ingredient-name">${ingredientName(id)}</span><span class="ingredient-stock"><b data-remaining></b> <small>из ${snapshot.level.stock[id]}</small></span><span class="ingredient-source">${snapshot.state.progress.round!.carryover[id] ? `Со вчера ${snapshot.state.progress.round!.carryover[id]} · ` : ''}Поставка ${snapshot.state.progress.round!.delivery[id]}</span><span class="ingredient-price"><b>${snapshot.level.costs[id]}</b> ${coins(snapshot.level.costs[id])} / порция</span><span class="ingredient-note" data-shortage></span></${tag}>`;
  }).join('');
}
function batchContent(batch: Batch, snapshot: Snapshot, index: number, shortages: readonly IngredientId[]): string {
  const evaluation = snapshot.evaluation.batches.find(item => item.batchId === batch.id)!;
  const factor = SIZE_FACTORS[batch.size];
  const fits = snapshot.level.recipes.some(recipe => snapshot.level.ingredientIds.every(id => batch.portions[id] <= recipe.portions[id] * factor));
  const name = evaluation.recipe?.name ?? (fits ? 'Заготовка' : 'Нет в меню');
  return `<button class="icon-button remove-batch" data-action="remove-batch" data-batch="${batch.id}" data-focus="remove-batch-${batch.id}" aria-label="Удалить партию ${index + 1}">${icon('trash')}</button>
  <div class="batch-body"><button class="pizza-select" data-action="select-batch" data-batch="${batch.id}" data-focus="select-${batch.id}" aria-label="Выбрать партию ${index + 1}: ${name}">${pizzaArt(batch)}<span class="pizza-caption">Перетащи продукты сюда</span></button>
  <div class="batch-info"><p class="batch-label">Партия ${index + 1}</p><h3 class="batch-title">${name}</h3><div class="sizes" role="group" aria-label="Размер пиццы в партии ${index + 1}">${snapshot.level.sizes.map(size => `<button class="size-button" data-action="size" data-batch="${batch.id}" data-size="${size}" data-focus="size-${batch.id}-${size}" aria-pressed="${size === batch.size}">${size} см</button>`).join('')}</div>
  <div class="composition"><p class="composition-label">Порции на одну пиццу${factor > 1 ? ` · полный слой: ${factor}` : ''}</p><div class="composition-chips">${snapshot.level.ingredientIds.filter(id => batch.portions[id] > 0).map(id => `<span class="portion-chip"><span class="portion-name">${ingredientName(id)}</span><b>${batch.portions[id]}</b>${id !== 'dough' ? `<button data-action="remove-ingredient" data-batch="${batch.id}" data-ingredient="${id}" data-focus="remove-${batch.id}-${id}" aria-label="Убрать порцию: ${ingredientName(id)}, партия ${index + 1}">−</button><button data-action="increase-ingredient" data-batch="${batch.id}" data-ingredient="${id}" data-focus="increase-${batch.id}-${id}" aria-label="Добавить порцию: ${ingredientName(id)}, партия ${index + 1}">+</button>` : ''}</span>`).join('')}</div></div>
  ${!evaluation.recipe ? `<p class="batch-empty-tip">${fits ? 'Добавь начинку сверху или загляни в рецепты.' : 'Такого состава нет в меню. Убери лишнюю начинку кнопкой «−».'}</p>` : ''}</div>
  <div class="batch-quantity"><p class="quantity-label">Количество</p><div class="stepper"><button data-action="quantity-minus" data-batch="${batch.id}" data-focus="minus-${batch.id}" aria-label="Уменьшить количество в партии ${index + 1}" ${batch.quantity === 0 ? 'disabled' : ''}>−</button><input type="number" min="0" max="999" inputmode="numeric" value="${batch.quantity}" data-quantity="${batch.id}" data-focus="quantity-${batch.id}" aria-label="Количество пицц в партии ${index + 1}"><button data-action="quantity-plus" data-batch="${batch.id}" data-focus="plus-${batch.id}" aria-label="Увеличить количество в партии ${index + 1}" ${batch.quantity === 999 ? 'disabled' : ''}>+</button></div>
  ${evaluation.recipe ? `<p class="batch-price">${evaluation.unitPrice} × ${batch.quantity} = ${evaluation.revenue}</p><p class="batch-cost">Выручка · ${coins(evaluation.revenue)}<br>Продукты: ${evaluation.cost}</p>` : '<p class="batch-unmatched">Рецепт пока<br>не найден</p>'}</div></div>
  ${shortages.length ? `<p class="batch-shortage" id="batch-shortage-${batch.id}">Не хватает в общем запасе: ${shortages.map(id => `${ingredientName(id)} — ${-snapshot.evaluation.remaining[id]} порц.`).join(', ')}</p>` : ''}`;
}

export function mountGame(root: HTMLElement, controller: GameController): void {
  const introductions = createIntroductionGuide(root, controller, target => {
    if (target === 'recipes') openRecipes();
    if (target === 'notebook') { root.querySelector<HTMLDetailsElement>('#notebook')!.open = true; sizeNotebook(root); }
  });
  let selectedBatchId = 1;
  let lastScreen = '';
  let recipeSize: PizzaSize = 15;
  let drag: { pointerId: number; ingredientId: IngredientId; startX: number; startY: number; source: HTMLElement; ghost?: HTMLElement; moved: boolean } | undefined;
  let ignoreIngredientClickUntil = 0;

  function render(snapshot: Snapshot): void {
    const focus = (document.activeElement as HTMLElement | null)?.dataset.focus;
    const { state, level, evaluation } = snapshot;
    const round = state.progress.round!;
    if (!state.batches.some(batch => batch.id === selectedBatchId)) selectedBatchId = state.batches[0].id;
    const screenKey = `${state.screen}:${level.id}`;
    if (state.screen === 'levels') {
      const totalStars = LEVELS.reduce((sum, item) => sum + (state.progress.levels[item.id]?.stars ?? 0), 0);
      root.innerHTML = `<div class="app-shell">${header(snapshot)}<main><section class="levels-intro"><div><p class="eyebrow">Твоя первая пиццерия</p><h1>Вкусно готовить. Выгодно считать.</h1><p>Собирай пиццы из доступных продуктов, сравнивай планы и находи лучшую прибыль. Можно думать сколько угодно.</p></div>${pizzaArt({ id: 0, size: 45, quantity: 1, portions: { dough: 9, sauce: 9, cheese: 9, olives: 9, sausage: 0, mushrooms: 0 } }, 'hero')}</section><div class="section-heading"><h2 class="section-title">${LEVELS.length} рабочих дней</h2><span class="section-meta">${totalStars} из ${LEVELS.length * 3} звёзд</span></div>${round.migrated ? `<p class="screen-note">Запасы старой игры не сохранялись. День ${round.levelId} начнётся с новой поставки. Деньги и заметки сохранены.</p>` : ''}<div class="level-grid">${LEVELS.map(item => {
        const progress = state.progress.levels[item.id];
        const unlocked = isLevelUnlocked(state.progress, item.id);
        const closed = item.id < round.levelId;
        const status = closed ? 'Завершён · повтор недоступен' : item.id === round.levelId
          ? (round.best ? 'Последний день · можно переиграть' : 'Текущий день')
          : unlocked ? 'Начать следующий день' : 'Ещё не открыт';
        return `<button class="level-card" data-action="open-level" data-level="${item.id}" data-focus="level-${item.id}" ${unlocked ? '' : 'disabled'} aria-label="День ${item.id}. ${item.title}. ${status}. ${progress?.stars ?? 0} из 3 звёзд"><div class="level-card-top"><span class="level-number">${item.id}</span>${unlocked || closed ? stars(progress?.stars ?? 0) : icon('lock')}</div><h2>${item.title}</h2><span class="level-status">${status}</span><small>${progress ? `Лучшая прибыль: ${progress.profit}` : `${item.ingredientIds.length} ${item.ingredientIds.length === 4 ? 'продукта' : 'продуктов'} · ${item.sizes.join(' / ')} см`}</small></button>`;
      }).join('')}</div><footer class="level-footer"><span>Одна звезда открывает следующий день.<br>Три звезды — за самую большую прибыль.</span><span>Остатки переходят дальше вместе с новой поставкой.<br>Переиграть можно только последний день.</span></footer></main></div>`;
    } else if (state.screen === 'planning') {
      if (lastScreen !== screenKey) {
        selectedBatchId = state.batches[0].id;
        root.innerHTML = `<div class="app-shell">${header(snapshot)}<main class="workspace"><div class="main-column"><section class="panel ingredient-panel" aria-label="Доступные продукты"><div class="section-heading"><h2 class="section-title">Продукты <span class="section-meta">· осталось</span></h2><span class="section-meta">Перетащи или нажми</span></div><div class="ingredients" style="--ingredient-count:${level.ingredientIds.length}">${ingredientTiles(snapshot)}</div></section><section class="instruction"><span class="instruction-number">${level.id}</span><div><h2>${level.title}</h2><p><strong class="instruction-label">Цель:</strong> ${level.lesson}</p>${level.tip ? `<p class="day-tip"><strong class="instruction-label">Подсказка:</strong> ${level.tip}</p>` : ''}<div id="hints"></div></div></section><section class="panel batch-area"><div class="section-heading"><h2 class="section-title">План готовки</h2><span class="section-meta" id="selection-label"></span></div><div class="batch-list" id="batch-list"></div><button class="add-batch" data-action="add-batch" data-focus="add-batch">${icon('plus')} Добавить партию</button></section></div><aside class="sidebar">${menu(snapshot)}<section class="panel money-panel" aria-label="Расчёты на раунд"><p class="money-label">Твой план на раунд</p><div class="money-row"><span>Выручка</span><strong id="revenue"></strong></div><div class="money-row"><span>Продукты</span><strong id="cost"></strong></div><div class="profit-box manual-profit" id="profit-content"></div><button class="button calculate-button" data-action="calculate-profit" data-focus="calculate-profit">Посчитать прибыль · 1 монета</button></section><button class="button primary cook-button" data-action="cook" data-focus="cook" aria-describedby="plan-issues">Приготовить ${icon('arrow')}</button><div class="plan-issues" id="plan-issues" role="status" aria-live="polite"></div><button class="button quiet hint-button" data-action="hint" data-focus="hint">${icon('bulb')} <span id="hint-label">Подсказка</span></button></aside></main><div class="compact-summary"><div><span>Пицц в плане</span><strong id="compact-pizza-count"></strong></div><button class="button primary" data-action="cook" data-focus="compact-cook">Приготовить ${icon('arrow')}</button></div></div>`;
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
        if (!card) { card = document.createElement('article'); card.className = 'batch'; card.dataset.pizzaSlot = String(batch.id); card.tabIndex = 0; card.setAttribute('role', 'group'); list.append(card); }
        const shortages = level.ingredientIds.filter(id => batch.quantity > 0 && batch.portions[id] > 0 && evaluation.remaining[id] < 0);
        const content = batchContent(batch, snapshot, index, shortages);
        // Оставляем DOM карточки на месте, пока её данные не изменились.
        if (card.dataset.content !== content) { card.innerHTML = content; card.dataset.content = content; }
        card.dataset.selected = String(batch.id === selectedBatchId);
        card.setAttribute('aria-label', `Партия ${index + 1}${batch.id === selectedBatchId ? ', выбрана для продуктов' : ', выбери для добавления продуктов'}`);
        card.querySelector('.pizza-select')!.setAttribute('aria-pressed', String(batch.id === selectedBatchId));
        card.classList.toggle('is-inactive', batch.quantity === 0);
        card.classList.toggle('has-shortage', shortages.length > 0);
        if (shortages.length) card.setAttribute('aria-describedby', `batch-shortage-${batch.id}`);
        else card.removeAttribute('aria-describedby');
      });
      root.querySelector('#selection-label')!.textContent = `Выбрана партия ${state.batches.findIndex(batch => batch.id === selectedBatchId) + 1}`;
      root.querySelector('#revenue')!.textContent = String(evaluation.revenue);
      root.querySelector('#cost')!.textContent = String(evaluation.cost);
      updateNotebook(root, snapshot.notebook);
      root.querySelector<HTMLElement>('#notebook-warning')!.hidden = !state.storageWarning;
      root.querySelector('#profit-content')!.innerHTML = state.profitHint === undefined
        ? '<strong>Прибыль посчитай сам</strong><p>Прибыль = Выручка − Продукты.</p>'
        : `<span class="profit-title">Расчёт подсказки</span><strong class="profit-value" data-calculated-profit>${state.profitHint}</strong><p>После подсказок: <b>${state.profitHint - state.hintCost} ${coins(state.profitHint - state.hintCost)}</b></p>`;
      root.querySelector('#compact-pizza-count')!.textContent = String(evaluation.pizzaCount);
      const calculate = root.querySelector<HTMLButtonElement>('[data-action="calculate-profit"]')!;
      calculate.disabled = !evaluation.canCook || state.profitHint !== undefined;
      calculate.textContent = state.profitHint === undefined ? 'Посчитать прибыль · 1 монета' : 'Расчёт открыт';
      for (const button of root.querySelectorAll<HTMLButtonElement>('[data-action="cook"]')) button.disabled = !evaluation.canCook;
      const issueBox = root.querySelector<HTMLElement>('#plan-issues')!;
      issueBox.classList.toggle('has-shortage', evaluation.issues.some(issue => issue.type === 'shortage'));
      issueBox.innerHTML = evaluation.canCook ? `<p class="plan-valid">${icon('check')} Всех продуктов хватает</p>` : `<ul>${evaluation.issues.map(issue => {
        if (issue.type === 'shortage') return `<li>${ingredientName(issue.ingredientId)}: не хватает ${issue.missing} порций.</li>`;
        if (issue.type === 'empty') return '<li>Добавь хотя бы одну пиццу.</li>';
        const index = state.batches.findIndex(batch => batch.id === issue.batchId) + 1;
        return `<li>Собери пиццу в партии ${index} по рецепту из меню.</li>`;
      }).join('')}</ul>`;
      root.querySelector('#hints')!.innerHTML = state.hintCount ? `<div class="hints">${level.hints.slice(0, state.hintCount).map(text => `<p><strong class="instruction-label">Подсказка:</strong> ${text}</p>`).join('')}</div>` : '';
      root.querySelector('#hint-label')!.textContent = state.hintCount === 0 ? 'Совет · 1 монета' : state.hintCount < level.hints.length ? 'Ещё совет · 1 монета' : 'Все советы открыты';
      root.querySelector<HTMLButtonElement>('[data-action="hint"]')!.disabled = state.hintCount >= level.hints.length;
      root.querySelector<HTMLElement>('[data-action="hint"]')!.hidden = !level.hints.length;
    } else {
      const result = state.result!;
      root.innerHTML = `<div class="app-shell">${header(snapshot)}<main class="result-wrap"><section class="panel result-card"><div class="result-stars" aria-label="${result.stars} из 3 звёзд">${[1,2,3].map(n => star(n <= result.stars)).join('')}</div><h1>${result.stars === 3 ? 'Лучший план найден!' : result.stars > 0 ? 'Пиццерия заработала!' : 'Попробуем другой план?'}</h1><p class="result-subtitle">${result.stars === 3 ? 'Ты получил максимум из доступного запаса.' : 'Попробуй улучшить сочетание пицц. Каждый продукт имеет значение.'}</p><div class="result-profit">${result.profit}<small>${coins(result.profit)} итоговой прибыли</small></div><p class="result-equation">Выручка ${result.revenue} − продукты ${result.cost} − подсказки ${result.hintCost} = ${result.profit}</p>
      <div class="reward-card"><span>В общий счёт</span><strong data-awarded>+${result.awarded} ${coins(result.awarded)}</strong><small>${result.awarded ? `Улучшение рекорда: ${result.previousBest} → ${result.profit}.` : 'Предыдущий рекорд не побит.'} Всего: ${state.progress.balance}&nbsp;₵.</small></div>
      <section class="carryover-card" aria-label="Сохранённые остатки"><h2>${level.id === LEVELS.length ? 'Остатки на складе' : 'Запас на следующий день'}</h2><p>${result.keptBest ? 'Сохранены остатки лучшей попытки этого дня.' : 'Эти продукты останутся на складе.'}</p><div class="carryover-list">${level.ingredientIds.filter(id => result.carryover[id] > 0).map(id => `<span>${ingredientName(id)} <b data-carryover="${id}">${result.carryover[id]}</b></span>`).join('') || '<span>Все продукты использованы.</span>'}</div></section>
      <div class="result-actions"><button class="button" data-action="retry" data-focus="retry">Изменить план</button><button class="button primary" data-action="next" data-focus="next" ${level.id !== LEVELS.length && !isLevelUnlocked(state.progress, level.id + 1) ? 'disabled' : ''}>${level.id === LEVELS.length ? 'К уровням' : 'Следующий день'} ${icon('arrow')}</button></div>
      ${state.storageWarning ? '<p class="storage-warning">Не удалось сохранить результат на устройстве. В этой вкладке прогресс сохранится до перезагрузки.</p>' : ''}</section><p class="screen-note">Повтор начинается с прежнего запаса. Сохраняются лучшая прибыль и её остатки.<br>${level.id === LEVELS.length ? 'Это последний день текущей игры.' : 'После начала следующего дня этот день нельзя переиграть.'}</p></main></div>`;
    }
    lastScreen = screenKey;
    if (focus) root.querySelector<HTMLElement>(`[data-focus="${CSS.escape(focus)}"]`)?.focus({ preventScroll: true });
    introductions.update(snapshot);
  }

  function selectBatch(id: number): void {
    if (selectedBatchId === id || !controller.getSnapshot().state.batches.some(batch => batch.id === id)) return;
    selectedBatchId = id;
    const batches = controller.getSnapshot().state.batches;
    root.querySelectorAll<HTMLElement>('[data-pizza-slot]').forEach((card, index) => {
      const selected = Number(card.dataset.pizzaSlot) === id;
      card.dataset.selected = String(selected);
      card.setAttribute('aria-label', `Партия ${index + 1}${selected ? ', выбрана для продуктов' : ', выбери для добавления продуктов'}`);
      card.querySelector('.pizza-select')?.setAttribute('aria-pressed', String(selected));
    });
    const label = root.querySelector('#selection-label');
    if (label) label.textContent = `Выбрана партия ${batches.findIndex(batch => batch.id === id) + 1}`;
  }
  function positionGameMenu(): void {
    const popover = root.querySelector<HTMLElement>('#game-menu');
    const button = root.querySelector<HTMLElement>('[popovertarget="game-menu"]');
    if (!popover || !button) return;
    const rect = button.getBoundingClientRect();
    popover.style.top = `${Math.max(12, rect.bottom + 8)}px`;
    popover.style.right = `${Math.max(12, window.innerWidth - rect.right)}px`;
  }
  function openResetConfirmation(): void {
    root.querySelector<HTMLElement>('#game-menu')?.hidePopover();
    const dialog = document.createElement('dialog');
    dialog.className = 'confirmation-dialog reset-dialog';
    dialog.setAttribute('aria-labelledby', 'reset-title');
    dialog.setAttribute('aria-describedby', 'reset-description');
    dialog.innerHTML = `<form method="dialog"><h2 id="reset-title">Начать сначала?</h2><p id="reset-description">Общий счёт, склад, звёзды, открытые уровни и все записи в блокноте будут сброшены. Игра начнётся с первого рабочего дня. Отменить сброс нельзя.</p><p class="storage-warning" data-reset-error role="alert" hidden>Не удалось сохранить сброс на устройстве. Прогресс не изменён. Попробуй ещё раз или нажми «Отмена».</p><div class="dialog-actions"><button class="button" value="cancel" autofocus>Отмена</button><button class="button danger" value="reset">Сбросить прогресс</button></div></form>`;
    dialog.addEventListener('close', () => {
      if (dialog.returnValue === 'reset' && !controller.dispatch({ type: 'reset-progress' })) {
        dialog.querySelector<HTMLElement>('[data-reset-error]')!.hidden = false;
        dialog.returnValue = '';
        dialog.showModal();
        return;
      }
      dialog.remove();
      if (dialog.returnValue !== 'reset') root.querySelector<HTMLButtonElement>('[popovertarget="game-menu"]')?.focus();
    });
    root.append(dialog);
    dialog.showModal();
  }
  function openHomeConfirmation(): void {
    const { state } = controller.getSnapshot();
    if (state.screen === 'levels') return;
    const dialog = document.createElement('dialog');
    dialog.className = 'confirmation-dialog home-dialog';
    dialog.setAttribute('aria-labelledby', 'home-title');
    dialog.setAttribute('aria-describedby', 'home-description');
    dialog.innerHTML = `<form method="dialog"><h2 id="home-title">Вернуться в главное меню?</h2><p id="home-description">${state.screen === 'planning' ? 'Текущий план придётся собрать заново. ' : ''}Сохранённые монеты, результаты и записи в блокноте останутся.</p><div class="dialog-actions"><button class="button" value="cancel" autofocus>Остаться в игре</button><button class="button primary" value="home">В главное меню</button></div></form>`;
    dialog.addEventListener('close', () => {
      dialog.remove();
      if (dialog.returnValue === 'home') {
        controller.dispatch({ type: 'show-levels' });
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
      root.querySelector<HTMLButtonElement>('[data-action="home"]')?.focus({ preventScroll: true });
    });
    root.append(dialog);
    dialog.showModal();
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
        return `<section class="drawer-recipe"><h3>${recipe.name}</h3><div class="recipe-portions">${snapshot.level.ingredientIds.filter(id => recipe.portions[id]).map(id => `<span>${ingredientName(id)}</span><strong>${recipe.portions[id] * factor}</strong>`).join('')}</div><p class="recipe-price">Цена: <strong>${offer.price}</strong> · Продукты: <strong>${cost}</strong></p></section>`;
      }).join('')}<p class="drawer-tip">Одно нажатие добавляет одну порцию. ${recipeSize === 15 ? 'Этого хватает на целый слой маленькой пиццы.' : recipeSize === 30 ? 'На пицце 30 см это четверть слоя. Для целого слоя нажми четыре раза.' : 'На пицце 45 см это одна девятая слоя. Для целого слоя нужно девять порций.'}</p>`;
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
    const card = (event.target as HTMLElement).closest<HTMLElement>('[data-pizza-slot]');
    if (card) selectBatch(Number(card.dataset.pizzaSlot));
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!target || (target as HTMLButtonElement).disabled) return;
    const action = target.dataset.action;
    const batchId = Number(target.dataset.batch);
    const snapshot = controller.getSnapshot();
    const batch = snapshot.state.batches.find(item => item.id === batchId);
    if (action === 'open-level') controller.dispatch({ type: 'open-level', levelId: Number(target.dataset.level) });
    else if (action === 'levels') { root.querySelector<HTMLElement>('#game-menu')?.hidePopover(); controller.dispatch({ type: 'show-levels' }); window.scrollTo({ top: 0, behavior: 'instant' }); }
    else if (action === 'home') openHomeConfirmation();
    else if (action === 'close-notebook') root.querySelector<HTMLDetailsElement>('#notebook')!.open = false;
    else if (action === 'recipes') openRecipes();
    else if (action === 'request-reset') openResetConfirmation();
    else if (action === 'select-batch') selectBatch(batchId);
    else if (action === 'add-batch') {
      controller.dispatch({ type: 'add-batch' });
      selectBatch(controller.getSnapshot().state.batches.at(-1)!.id);
      root.querySelector<HTMLElement>(`[data-pizza-slot="${selectedBatchId}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } else if (action === 'remove-batch') controller.dispatch({ type: 'remove-batch', batchId });
    else if (action === 'add-ingredient') {
      if (performance.now() < ignoreIngredientClickUntil) return;
      controller.dispatch({ type: 'ingredient', batchId: selectedBatchId, ingredientId: target.dataset.ingredient as IngredientId, delta: 1 });
    } else if (action === 'remove-ingredient' || action === 'increase-ingredient') {
      selectedBatchId = batchId;
      controller.dispatch({ type: 'ingredient', batchId, ingredientId: target.dataset.ingredient as IngredientId, delta: action === 'increase-ingredient' ? 1 : -1 });
    } else if (action === 'size') {
      selectedBatchId = batchId;
      controller.dispatch({ type: 'set-size', batchId, size: Number(target.dataset.size) as PizzaSize });
    } else if (action === 'quantity-plus' || action === 'quantity-minus') {
      if (batch) controller.dispatch({ type: 'set-quantity', batchId, quantity: batch.quantity + (action === 'quantity-plus' ? 1 : -1) });
    } else if (action === 'cook') controller.dispatch({ type: 'cook' });
    else if (action === 'hint') controller.dispatch({ type: 'hint' });
    else if (action === 'retry') controller.dispatch({ type: 'retry' });
    else if (action === 'next') controller.dispatch({ type: 'next-level' });
    else if (action === 'calculate-profit') controller.dispatch({ type: 'calculate-profit' });
    else if (action === 'add-note') {
      controller.dispatch({ type: 'add-note' });
      const row = controller.getSnapshot().notebook.at(-1)!;
      root.querySelector<HTMLTextAreaElement>(`[data-note="${row.id}"][data-field="pizzas"]`)?.focus();
    }
  });
  root.addEventListener('keydown', event => {
    const card = event.target as HTMLElement;
    if (card.matches('[data-pizza-slot]') && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault(); selectBatch(Number(card.dataset.pizzaSlot));
    }
  });
  root.addEventListener('input', event => {
    const input = event.target as HTMLTextAreaElement;
    if (!input.matches('textarea[data-note]')) return;
    controller.dispatch({ type: 'update-note', rowId: Number(input.dataset.note), field: input.dataset.field as 'pizzas' | 'profit', value: input.value });
  });
  root.addEventListener('beforetoggle', event => {
    if ((event.target as HTMLElement).id === 'game-menu' && (event as ToggleEvent).newState === 'open') positionGameMenu();
  }, true);
  root.addEventListener('toggle', event => {
    if (!(event.target instanceof HTMLDetailsElement) || event.target.id !== 'notebook') return;
    sizeNotebook(root);
  }, true);
  window.addEventListener('resize', () => { sizeNotebook(root); positionGameMenu(); });
  window.addEventListener('scroll', () => {
    if (root.querySelector('#game-menu:popover-open')) positionGameMenu();
    sizeNotebook(root);
  }, { passive: true });
  window.addEventListener('keydown', event => {
    const notebook = root.querySelector<HTMLDetailsElement>('#notebook');
    if (event.key === 'Escape' && notebook?.open && !root.querySelector('dialog[open], :popover-open')) {
      event.preventDefault();
      notebook.open = false;
      notebook.querySelector<HTMLElement>('summary')!.focus({ preventScroll: true });
    }
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
