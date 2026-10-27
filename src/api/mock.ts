/**
 * Mock-реализация репозиториев поверх localStorage.
 * Поведение идентично прежнему синхронному коду контекстов
 * (демо-аккаунты, проверка уникальности недели, журнал изменений),
 * но интерфейс асинхронный — как у настоящего REST API.
 */
import type { User, WeeklyReport, ReportEditLog, Role } from '../types';
import { hashPassword, verifyPassword } from '../utils/calculations';
import { generateId } from '../utils/id';
import { initializeDemoData } from '../utils/demoData';
import { STORAGE_KEYS, readJSON, writeJSON } from '../utils/storage';
import type {
  AuthResult,
  MutationResult,
  NewReport,
  ReportsRepository,
  UsersRepository,
} from './types';

const ok: MutationResult = { success: true };
const fail = (error: string): MutationResult => ({ success: false, error });

function loadUsers(): User[] {
  let users = readJSON<User[]>(STORAGE_KEYS.users, []);
  if (users.length === 0) {
    users = seedDefaultUsers();
  }
  return users;
}

function saveUsers(users: User[]): void {
  writeJSON(STORAGE_KEYS.users, users);
}

function seedDefaultUsers(): User[] {
  const now = new Date().toISOString();
  const mk = (id: string, username: string, email: string, password: string, role: Role): User => ({
    id,
    username,
    email,
    password_hash: hashPassword(password),
    role,
    created_at: now,
  });
  const users: User[] = [
    mk('admin_1', 'Администратор', 'admin@taxi.ru', 'admin123', 'admin'),
    mk('manager_1', 'Руководитель', 'manager@taxi.ru', 'manager123', 'manager'),
    mk('driver_1', 'Иванов И.И.', 'driver1@taxi.ru', 'driver123', 'driver'),
    mk('driver_2', 'Петров П.П.', 'driver2@taxi.ru', 'driver123', 'driver'),
  ];
  saveUsers(users);
  return users;
}

export function createMockUsersRepository(): UsersRepository {
  return {
    async list() {
      return loadUsers();
    },

    async login(email: string, password: string): Promise<AuthResult> {
      const found = loadUsers().find(u => u.email === email);
      if (!found) return { success: false, error: 'Пользователь не найден' };
      if (!verifyPassword(password, found.password_hash)) {
        return { success: false, error: 'Неверный пароль' };
      }
      // Токен = id пользователя (демо; на бэкенде — подпись/сессия).
      return { success: true, token: found.id, user: found };
    },

    async register(username: string, email: string, password: string, role: Role) {
      const users = loadUsers();
      if (users.find(u => u.email === email)) return fail('Email уже зарегистрирован');
      users.push({
        id: generateId(),
        username,
        email,
        password_hash: hashPassword(password),
        role,
        created_at: new Date().toISOString(),
      });
      saveUsers(users);
      return ok;
    },

    async create(data) {
      const users = loadUsers();
      if (users.find(u => u.email === data.email)) return fail('Email уже зарегистрирован');
      users.push({
        id: generateId(),
        username: data.username,
        email: data.email,
        password_hash: hashPassword(data.password),
        role: data.role,
        created_at: new Date().toISOString(),
      });
      saveUsers(users);
      return ok;
    },

    async update(id: string, patch: Partial<User>) {
      const users = loadUsers();
      const idx = users.findIndex(u => u.id === id);
      if (idx === -1) return fail('Пользователь не найден');
      users[idx] = { ...users[idx], ...patch };
      saveUsers(users);
      return ok;
    },

    async remove(id: string) {
      saveUsers(loadUsers().filter(u => u.id !== id));
      return ok;
    },
  };
}

export function createMockReportsRepository(): ReportsRepository {
  const ensureDemo = () => {
    initializeDemoData();
  };
  const loadReports = (): WeeklyReport[] => readJSON<WeeklyReport[]>(STORAGE_KEYS.reports, []);
  const loadLogs = (): ReportEditLog[] => readJSON<ReportEditLog[]>(STORAGE_KEYS.editLogs, []);

  return {
    async listReports() {
      ensureDemo();
      return loadReports();
    },

    async listEditLogs() {
      ensureDemo();
      return loadLogs();
    },

    async addReport(report: NewReport) {
      ensureDemo();
      const reports = loadReports();
      const existing = reports.find(
        r => r.user_id === report.user_id && r.year === report.year && r.week_number === report.week_number
      );
      if (existing) return fail('Отчёт за эту неделю уже существует');
      const now = new Date().toISOString();
      reports.push({ ...report, id: generateId(), created_at: now, updated_at: now });
      writeJSON(STORAGE_KEYS.reports, reports);
      return ok;
    },

    async updateReport(id: string, data: Partial<WeeklyReport>, changedByUserId: string) {
      const reports = loadReports();
      const report = reports.find(r => r.id === id);
      if (!report) return fail('Отчёт не найден');

      const fields: (keyof WeeklyReport)[] = [
        'wheely_gross', 'yandex_gross', 'own_rent_gross', 'hourly_rent_hours',
        'compensations', 'bonuses', 'deductions', 'total_driver_payout',
      ];
      const newLogs: ReportEditLog[] = [];
      fields.forEach(field => {
        if (data[field] !== undefined && data[field] !== report[field]) {
          newLogs.push({
            id: generateId(),
            report_id: id,
            changed_by_user_id: changedByUserId,
            field_name: field,
            old_value: String(report[field]),
            new_value: String(data[field]),
            changed_at: new Date().toISOString(),
          });
        }
      });
      if (newLogs.length > 0) {
        writeJSON(STORAGE_KEYS.editLogs, [...loadLogs(), ...newLogs]);
      }
      writeJSON(
        STORAGE_KEYS.reports,
        reports.map(r => (r.id === id ? { ...r, ...data, updated_at: new Date().toISOString() } : r))
      );
      return ok;
    },

    async deleteReport(id: string) {
      writeJSON(STORAGE_KEYS.reports, loadReports().filter(r => r.id !== id));
      writeJSON(STORAGE_KEYS.editLogs, loadLogs().filter(l => l.report_id !== id));
      return ok;
    },
  };
}
