/**
 * Единая точка доступа к localStorage.
 * Все ключи и операции чтения/записи сосредоточены здесь,
 * чтобы контексты и утилиты не работали с localStorage напрямую
 * и не дублировали строковые константы ключей.
 */

/** Доменные константы приложения (ключи хранилища). */
export const STORAGE_KEYS = {
  users: 'taxi_users',
  session: 'taxi_session',
  reports: 'taxi_reports',
  editLogs: 'taxi_edit_logs',
} as const;

/** Безопасное чтение JSON из localStorage. При ошибке возвращает fallback. */
export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    // Повреждённые данные (например, после сбоя) — считаем хранилище пустым.
    return fallback;
  }
}

/** Запись значения в localStorage в формате JSON. */
export function writeJSON(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

/** Удаление значения из localStorage. */
export function removeItem(key: string): void {
  localStorage.removeItem(key);
}
