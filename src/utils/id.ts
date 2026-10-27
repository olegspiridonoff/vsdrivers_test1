/**
 * Генерация уникальных идентификаторов записей.
 * Использует нативный Web Crypto API вместо устаревшего Math.random().
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // Фолбэк для окружений без crypto.randomUUID
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
