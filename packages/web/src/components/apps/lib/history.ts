import { AppType } from '@srcbook/shared';
import type { MessageType } from '../types.js';

const HISTORY_KEY_PREFIX = 'sb:app_history:';

export function persistHistory(app: AppType, history: MessageType[]): void {
  localStorage.setItem(`${HISTORY_KEY_PREFIX}${app.id}`, JSON.stringify(history));
}

export function appendHistory(app: AppType, message: MessageType): void {
  const history = getHistory(app);
  history.push(message);
  persistHistory(app, history);
}

export function getHistory(app: AppType): MessageType[] {
  const storedHistory = localStorage.getItem(`${HISTORY_KEY_PREFIX}${app.id}`);
  return storedHistory ? JSON.parse(storedHistory) : [];
}
