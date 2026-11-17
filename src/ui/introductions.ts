import type { GameController, Snapshot } from '../app/controller';
import { INTRODUCTIONS, notebookExamples } from '../app/introductions';
import { icon } from './art';

export function createIntroductionGuide(root: HTMLElement, controller: GameController, explore: (target: string) => void) {
  let dialog: HTMLDialogElement | undefined;
  let activeId = '';
  let target: HTMLElement | null = null;

  function position(): void {
    if (!dialog?.open) return;
    const gap = 16;
    dialog.style.maxHeight = `${window.innerHeight - gap * 2}px`;
    let rect = target?.getBoundingClientRect();
    let height = dialog.getBoundingClientRect().height;
    const width = dialog.getBoundingClientRect().width;
    let top = (window.innerHeight - height) / 2;
    if (rect) {
      if (rect.bottom + gap + height > window.innerHeight - gap && rect.top - gap - height < gap) {
        window.scrollBy({ top: Math.max(0, rect.top - gap), behavior: 'instant' });
        rect = target!.getBoundingClientRect();
      }
      const below = window.innerHeight - rect.bottom - gap * 2;
      const above = rect.top - gap * 2;
      const placeBelow = below >= height || (above < height && below >= above);
      // Округляем свободное место вниз: дробные координаты не должны выталкивать окно на кнопку.
      dialog.style.maxHeight = `${Math.max(80, Math.floor(placeBelow ? below : above))}px`;
      height = dialog.getBoundingClientRect().height;
      top = placeBelow ? rect.bottom + gap : rect.top - gap - height;
    }
    const left = rect ? Math.max(gap, Math.min(rect.left, window.innerWidth - width - gap)) : (window.innerWidth - width) / 2;
    dialog.style.left = `${left}px`;
    dialog.style.top = `${Math.max(gap, top)}px`;
    const spotlight = dialog.querySelector<HTMLElement>('.introduction-spotlight')!;
    spotlight.hidden = !rect;
    if (rect) Object.assign(spotlight.style, {
      left: `${rect.left - 5}px`, top: `${rect.top - 5}px`,
      width: `${rect.width + 10}px`, height: `${rect.height + 10}px`,
    });
    const arrow = dialog.querySelector<HTMLElement>('.introduction-arrow')!;
    const below = rect && top >= rect.bottom;
    const above = rect && top + height <= rect.top;
    arrow.hidden = !below && !above;
    if (rect) {
      arrow.style.left = `${Math.max(left + 20, Math.min(rect.left + rect.width / 2, left + width - 20))}px`;
      arrow.style.top = `${below ? top - 7 : top + height - 7}px`;
    }
  }
  window.addEventListener('resize', position);
  window.addEventListener('scroll', position, { passive: true });

  return {
    update(snapshot: Snapshot): void {
      const id = snapshot.state.screen === 'planning' ? snapshot.state.introductions[0] : undefined;
      if (id === activeId && dialog?.isConnected) return;
      if (dialog) { dialog.remove(); dialog = undefined; }
      activeId = id ?? '';
      if (!id) return;
      const intro = INTRODUCTIONS.find(item => item.id === id)!;
      const targetId = 'target' in intro ? intro.target : undefined;
      target = targetId === 'notebook' ? root.querySelector('#notebook summary')
        : targetId === 'recipes' ? root.querySelector('[data-action="recipes"]')
        : targetId ? root.querySelector(`[data-stock="${targetId}"]`) : null;
      target?.scrollIntoView({ block: 'center', behavior: 'instant' });
      const examples = id === 'notebook' ? notebookExamples(snapshot.level) : undefined;
      const opened = document.createElement('dialog');
      dialog = opened;
      opened.className = 'introduction-dialog';
      opened.dataset.introduction = id;
      opened.setAttribute('aria-labelledby', 'introduction-title');
      opened.innerHTML = `<span class="introduction-spotlight" aria-hidden="true" hidden></span><span class="introduction-arrow" aria-hidden="true" hidden></span><form method="dialog"><div class="introduction-heading"><span class="eyebrow">День ${snapshot.level.id} · знакомство</span><button class="icon-button" value="done" aria-label="Закрыть подсказку">${icon('close')}</button></div><h2 id="introduction-title">${intro.title}</h2>${intro.paragraphs.map(text => `<p>${text}</p>`).join('')}${examples ? `<table class="introduction-example"><thead><tr><th>Пиццы</th><th>Прибыль, ₵</th></tr></thead><tbody>${examples.map(example => `<tr><td>${example.pizzas.replaceAll('\n', '<br>')}</td><td>${example.profit}</td></tr>`).join('')}</tbody></table>` : ''}<div class="dialog-actions">${snapshot.state.introductions.length === 1 && (targetId === 'notebook' || targetId === 'recipes') ? `<button class="button" value="explore">${targetId === 'notebook' ? 'Открыть блокнот' : 'Открыть рецепты'}</button>` : ''}<button class="button primary" value="done" autofocus>${id === 'goal' ? 'Начать первый день' : 'Понятно'}</button></div></form>`;
      opened.addEventListener('close', () => {
        const shouldExplore = opened.returnValue === 'explore';
        opened.remove(); dialog = undefined; activeId = '';
        controller.dispatch({ type: 'dismiss-introduction', id });
        if (!controller.getSnapshot().state.introductions.length) {
          if (shouldExplore && targetId) explore(targetId);
          else target?.focus({ preventScroll: true });
        }
      }, { once: true });
      document.body.append(opened);
      opened.showModal();
      position();
    },
  };
}
