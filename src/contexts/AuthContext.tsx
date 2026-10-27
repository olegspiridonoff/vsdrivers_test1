import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Role } from '../types';
import { usersApi, getToken, setToken } from '../api';
import type { MutationResult } from '../api';

interface AuthContextType {
  user: User | null;
  users: User[];
  /** Данные (список пользователей/сессия) ещё загружаются через API-слой. */
  loading: boolean;
  login: (email: string, password: string) => Promise<MutationResult>;
  register: (username: string, email: string, password: string, role: Role) => Promise<MutationResult>;
  logout: () => void;
  updateUser: (id: string, data: Partial<User>) => Promise<MutationResult>;
  deleteUser: (id: string) => Promise<MutationResult>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Загрузка пользователей и восстановление сессии идут через API-слой:
  // mock → localStorage (поведение прежнее), rest → PHP+PDO бэкенд.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const allUsers = await usersApi.list();
        if (cancelled) return;
        setUsers(allUsers);
        const token = getToken();
        if (token) {
          const found = allUsers.find(u => u.id === token);
          if (found) setUser(found);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshUsers = async () => {
    setUsers(await usersApi.list());
  };

  const login = async (email: string, password: string): Promise<MutationResult> => {
    const result = await usersApi.login(email, password);
    if (result.success && result.user) {
      setUser(result.user);
      setToken(result.token ?? null);
    }
    return { success: result.success, error: result.error };
  };

  const register = async (
    username: string,
    email: string,
    password: string,
    role: Role
  ): Promise<MutationResult> => {
    const result = await usersApi.register(username, email, password, role);
    if (result.success) await refreshUsers();
    return result;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
  };

  const updateUser = async (id: string, data: Partial<User>): Promise<MutationResult> => {
    const result = await usersApi.update(id, data);
    if (result.success) {
      await refreshUsers();
      setUser(prev => (prev && prev.id === id ? { ...prev, ...data } : prev));
    }
    return result;
  };

  const deleteUser = async (id: string): Promise<MutationResult> => {
    const result = await usersApi.remove(id);
    if (result.success) {
      await refreshUsers();
      setUser(prev => (prev && prev.id === id ? null : prev));
    }
    return result;
  };

  return (
    <AuthContext.Provider
      value={{ user, users, loading, login, register, logout, updateUser, deleteUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
