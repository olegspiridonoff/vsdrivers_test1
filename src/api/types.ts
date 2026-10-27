/**
 * Контракты API-слоя. Формы запросов/ответов соответствуют эндпоинтам
 * /api/auth, /api/users, /api/reports (см. server/api/*.php) и совпадают
 * с текущими сигнатурами контекстов, чтобы переход localStorage → REST
 * был локальным (меняется только реализация, не потребители).
 */
import type { WeeklyReport, ReportEditLog, User, Role } from '../types';

export interface AuthResult {
  success: boolean;
  error?: string;
  token?: string;
  user?: User;
}

export interface MutationResult {
  success: boolean;
  error?: string;
}

export type NewReport = Omit<WeeklyReport, 'id' | 'created_at' | 'updated_at'>;

/** Интерфейс хранилища пользователей (реализации: mock и rest). */
export interface UsersRepository {
  list(): Promise<User[]>;
  login(email: string, password: string): Promise<AuthResult>;
  register(username: string, email: string, password: string, role: Role): Promise<MutationResult>;
  create(data: Omit<User, 'id' | 'created_at' | 'password_hash'> & { password: string }): Promise<MutationResult>;
  update(id: string, data: Partial<User>): Promise<MutationResult>;
  remove(id: string): Promise<MutationResult>;
}

/** Интерфейс хранилища отчётов и журналов изменений. */
export interface ReportsRepository {
  listReports(): Promise<WeeklyReport[]>;
  listEditLogs(): Promise<ReportEditLog[]>;
  addReport(report: NewReport): Promise<MutationResult>;
  updateReport(id: string, data: Partial<WeeklyReport>, changedByUserId: string): Promise<MutationResult>;
  deleteReport(id: string): Promise<MutationResult>;
}
