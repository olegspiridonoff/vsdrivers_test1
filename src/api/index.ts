/**
 * Точка входа API-слоя: выбор реализации (mock ↔ rest) в одном месте.
 *
 * По умолчанию приложение работает на mock (localStorage) — поведение
 * не меняется. Для переключения на реальный бэкенд создайте .env.local:
 *   VITE_API_MODE=rest
 *   VITE_API_URL=http://localhost:8080/api
 */
import { createMockReportsRepository, createMockUsersRepository } from './mock';
import { createRestReportsRepository, createRestUsersRepository } from './rest';
import type { ReportsRepository, UsersRepository } from './types';

const MODE = ((import.meta.env.VITE_API_MODE as string | undefined) ?? 'mock').toLowerCase();

export const usersApi: UsersRepository =
  MODE === 'rest' ? createRestUsersRepository() : createMockUsersRepository();

export const reportsApi: ReportsRepository =
  MODE === 'rest' ? createRestReportsRepository() : createMockReportsRepository();

export { ApiError, getToken, setToken } from './client';
export type { AuthResult, MutationResult, NewReport } from './types';
