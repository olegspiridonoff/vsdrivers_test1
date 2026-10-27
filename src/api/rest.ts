/**
 * REST-реализация репозиториев поверх HTTP-клиента.
 * Используется, когда поднят настоящий бэкенд (PHP+PDO, см. каталог server/).
 * Включение: VITE_API_MODE=rest (см. src/api/index.ts).
 */
import type { User, WeeklyReport, ReportEditLog, Role } from '../types';
import { http, ApiError, setToken } from './client';
import type {
  AuthResult,
  MutationResult,
  NewReport,
  ReportsRepository,
  UsersRepository,
} from './types';

export function createRestUsersRepository(): UsersRepository {
  return {
    async list() {
      return http.get<User[]>('/users');
    },

    async login(email: string, password: string): Promise<AuthResult> {
      try {
        const data = await http.post<{ token: string; user: User }>('/auth/login', { email, password });
        setToken(data.token);
        return { success: true, token: data.token, user: data.user };
      } catch (e) {
        return { success: false, error: e instanceof ApiError ? e.message : 'Ошибка входа' };
      }
    },

    async register(username: string, email: string, password: string, role: Role) {
      return http.post<MutationResult>('/auth/register', { username, email, password, role });
    },

    async create(data) {
      return http.post<MutationResult>('/users', data);
    },

    async update(id: string, patch: Partial<User>) {
      return http.patch<MutationResult>(`/users/${id}`, patch);
    },

    async remove(id: string) {
      return http.delete<MutationResult>(`/users/${id}`);
    },
  };
}

export function createRestReportsRepository(): ReportsRepository {
  return {
    async listReports() {
      return http.get<WeeklyReport[]>('/reports');
    },

    async listEditLogs() {
      return http.get<ReportEditLog[]>('/reports/logs');
    },

    async addReport(report: NewReport) {
      return http.post<MutationResult>('/reports', report);
    },

    async updateReport(id: string, data: Partial<WeeklyReport>, changedByUserId: string) {
      return http.patch<MutationResult>(`/reports/${id}`, { ...data, changed_by_user_id: changedByUserId });
    },

    async deleteReport(id: string) {
      return http.delete<MutationResult>(`/reports/${id}`);
    },
  };
}
