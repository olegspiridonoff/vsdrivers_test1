import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Role } from '../types';
import { hashPassword, verifyPassword } from '../utils/calculations';
import { generateId } from '../utils/id';
import { STORAGE_KEYS, readJSON, writeJSON, removeItem } from '../utils/storage';

interface AuthContextType {
  user: User | null;
  users: User[];
  login: (email: string, password: string) => { success: boolean; error?: string };
  register: (username: string, email: string, password: string, role: Role) => { success: boolean; error?: string };
  logout: () => void;
  updateUser: (id: string, data: Partial<User>) => void;
  deleteUser: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function initializeDefaultUsers(): User[] {
  const users: User[] = [
    {
      id: 'admin_1',
      username: 'Администратор',
      email: 'admin@taxi.ru',
      password_hash: hashPassword('admin123'),
      role: 'admin',
      created_at: new Date().toISOString()
    },
    {
      id: 'manager_1',
      username: 'Руководитель',
      email: 'manager@taxi.ru',
      password_hash: hashPassword('manager123'),
      role: 'manager',
      created_at: new Date().toISOString()
    },
    {
      id: 'driver_1',
      username: 'Иванов И.И.',
      email: 'driver1@taxi.ru',
      password_hash: hashPassword('driver123'),
      role: 'driver',
      created_at: new Date().toISOString()
    },
    {
      id: 'driver_2',
      username: 'Петров П.П.',
      email: 'driver2@taxi.ru',
      password_hash: hashPassword('driver123'),
      role: 'driver',
      created_at: new Date().toISOString()
    }
  ];
  writeJSON(STORAGE_KEYS.users, users);
  return users;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    let allUsers = readJSON<User[]>(STORAGE_KEYS.users, []);
    if (allUsers.length === 0) {
      allUsers = initializeDefaultUsers();
    }
    setUsers(allUsers);
    const session = readJSON<string | null>(STORAGE_KEYS.session, null);
    if (session) {
      const found = allUsers.find((u: User) => u.id === session);
      if (found) setUser(found);
    }
  }, []);

  // Единая точка записи списка пользователей: реактивный state + localStorage.
  const persistUsers = (next: User[]) => {
    writeJSON(STORAGE_KEYS.users, next);
    setUsers(next);
  };

  const login = (email: string, password: string) => {
    const found = users.find(u => u.email === email);
    if (!found) return { success: false, error: 'Пользователь не найден' };
    if (!verifyPassword(password, found.password_hash)) return { success: false, error: 'Неверный пароль' };
    setUser(found);
    writeJSON(STORAGE_KEYS.session, found.id);
    return { success: true };
  };

  const register = (username: string, email: string, password: string, role: Role) => {
    if (users.find(u => u.email === email)) return { success: false, error: 'Email уже зарегистрирован' };
    const newUser: User = {
      id: generateId(),
      username,
      email,
      password_hash: hashPassword(password),
      role,
      created_at: new Date().toISOString()
    };
    persistUsers([...users, newUser]);
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    removeItem(STORAGE_KEYS.session);
  };

  const updateUser = (id: string, data: Partial<User>) => {
    const idx = users.findIndex(u => u.id === id);
    if (idx !== -1) {
      const updated = { ...users[idx], ...data };
      const next = [...users];
      next[idx] = updated;
      persistUsers(next);
      if (user?.id === id) setUser(updated);
    }
  };

  const deleteUser = (id: string) => {
    persistUsers(users.filter(u => u.id !== id));
  };

  return (
    <AuthContext.Provider value={{ user, users, login, register, logout, updateUser, deleteUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
