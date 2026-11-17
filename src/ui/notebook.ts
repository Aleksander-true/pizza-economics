import type { NotebookRow } from '../engine/types';
import { icon } from './art';

export function notebookMarkup(levelId: number): string {
  return `<details id="notebook" class="notebook-panel"><summary data-focus="notebook-toggle">${icon('notebook')}<span>Блокнот</span><span class="notebook-chevron">${icon('chevron')}</span></summary><div class="panel notebook-content"><div class="notebook-heading"><span>Мои расчёты · Уровень ${levelId}</span><button class="icon-button" data-action="close-notebook" aria-label="Свернуть блокнот">${icon('close')}</button></div><table class="notebook-table"><colgroup><col class="note-pizzas"><col class="note-profit"></colgroup><thead><tr><th scope="col">Пиццы</th><th scope="col">Прибыль, ₵</th></tr></thead><tbody id="notebook-rows"></tbody></table><button class="button quiet add-note" data-action="add-note" data-focus="add-note">+ Добавить запись</button><p class="notebook-help">Enter — новая строка в записи.<br>Заметки сохраняются для этого уровня.</p><p id="notebook-warning" class="storage-warning" hidden>Не удалось сохранить заметки на устройстве.</p></div></details>`;
}

export function sizeNotebook(root: HTMLElement): void {
  const notebook = root.querySelector<HTMLDetailsElement>('#notebook');
  if (!notebook?.open) return;
  const content = notebook.querySelector<HTMLElement>('.notebook-content')!;
  const rect = notebook.querySelector('summary')!.getBoundingClientRect();
  const top = Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - 160));
  const left = Math.max(12, Math.min(rect.right - content.offsetWidth, window.innerWidth - content.offsetWidth - 12));
  content.style.top = `${top}px`;
  content.style.left = `${left}px`;
  content.style.maxHeight = `${window.innerHeight - top - 12}px`;
  for (const row of root.querySelectorAll<HTMLTableRowElement>('[data-note-row]')) {
    const inputs = [...row.querySelectorAll<HTMLTextAreaElement>('textarea')];
    if (!inputs[0]?.getBoundingClientRect().width) continue;
    for (const input of inputs) input.style.height = '0px';
    const height = Math.max(68, ...inputs.map(input => input.scrollHeight));
    for (const input of inputs) input.style.height = `${height}px`;
  }
}

export function updateNotebook(root: HTMLElement, rows: readonly NotebookRow[]): void {
  const body = root.querySelector('#notebook-rows');
  if (!body) return;
  for (const [index, note] of rows.entries()) {
    let row = body.querySelector<HTMLElement>(`[data-note-row="${note.id}"]`);
    if (!row) {
      row = document.createElement('tr'); row.dataset.noteRow = String(note.id);
      row.innerHTML = `<td><textarea rows="2" data-note="${note.id}" data-field="pizzas" data-focus="note-${note.id}-pizzas" aria-label="Пиццы, запись ${index + 1}" spellcheck="false"></textarea></td><td><textarea rows="2" inputmode="numeric" data-note="${note.id}" data-field="profit" data-focus="note-${note.id}-profit" aria-label="Прибыль, запись ${index + 1}" spellcheck="false"></textarea></td>`;
      body.append(row);
    }
    for (const field of ['pizzas', 'profit'] as const) {
      const input = row.querySelector<HTMLTextAreaElement>(`[data-field="${field}"]`)!;
      // Пользовательские заметки присваиваются как текст, а не вставляются в HTML.
      if (input.value !== note[field]) input.value = note[field];
    }
  }
  sizeNotebook(root);
}
