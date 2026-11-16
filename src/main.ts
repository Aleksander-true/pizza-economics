import { createController } from './app/controller';
import { LEVELS } from './data/levels';
import { createProgressStore } from './storage/progress';
import { mountGame } from './ui/view';
import './ui/style.css';

let storage: Storage | undefined;
try { storage = window.localStorage; } catch { /* В приватном режиме игра продолжает работать без сохранения. */ }
const controller = createController(LEVELS, createProgressStore(storage));
mountGame(document.querySelector<HTMLElement>('#app')!, controller);
