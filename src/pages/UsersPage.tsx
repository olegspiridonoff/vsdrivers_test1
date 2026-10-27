import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Role } from '../types';
import { UserPlus, Trash2, Edit2, Shield, X, Check } from 'lucide-react';
import { Alert, Field, TextInput, SelectInput, RoleBadge, roleLabel } from '../components/ui/primitives';

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'driver', label: roleLabel('driver') },
  { value: 'manager', label: roleLabel('manager') },
  { value: 'admin', label: roleLabel('admin') },
];

export default function UsersPage() {
  const { users, register, updateUser, deleteUser, user: currentUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('driver');
  const [error, setError] = useState('');

  const resetForm = () => {
    setShowForm(false);
    setEditingUser(null);
    setUsername('');
    setEmail('');
    setPassword('');
    setRole('driver');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (editingUser) {
      updateUser(editingUser.id, { username, email, role });
    } else {
      const result = register(username, email, password, role);
      if (!result.success) {
        setError(result.error || 'Ошибка');
        return;
      }
    }
    resetForm();
  };

  const handleEdit = (u: User) => {
    setEditingUser(u);
    setUsername(u.username);
    setEmail(u.email);
    setRole(u.role);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (id === currentUser?.id) {
      setError('Нельзя удалить свой аккаунт');
      return;
    }
    if (confirm('Удалить пользователя?')) {
      deleteUser(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Управление пользователями</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-gray-900 font-medium rounded-lg transition-all">
          <UserPlus className="w-4 h-4" /> Добавить
        </button>
      </div>

      <Alert kind="error" message={error} />

      {showForm && (
        <div className="bg-gray-800/50 backdrop-blur border border-gray-700/50 rounded-xl p-6">
          <h3 className="text-white font-medium mb-4">
            {editingUser ? 'Редактирование пользователя' : 'Новый пользователь'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Имя">
                <TextInput type="text" value={username} onChange={e => setUsername(e.target.value)} required />
              </Field>
              <Field label="Email">
                <TextInput type="email" value={email} onChange={e => setEmail(e.target.value)} required />
              </Field>
              {!editingUser && (
                <Field label="Пароль">
                  <TextInput type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                </Field>
              )}
              <Field label="Роль">
                <SelectInput value={role} onChange={e => setRole(e.target.value as Role)} options={ROLE_OPTIONS} />
              </Field>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-gray-900 font-medium rounded-lg transition-all">
                <Check className="w-4 h-4" /> Сохранить
              </button>
              <button type="button" onClick={resetForm}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all">
                <X className="w-4 h-4" /> Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-gray-800/50 backdrop-blur border border-gray-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700/50">
                <th className="text-left px-5 py-3 text-gray-400 text-sm font-medium">Пользователь</th>
                <th className="text-left px-5 py-3 text-gray-400 text-sm font-medium">Email</th>
                <th className="text-left px-5 py-3 text-gray-400 text-sm font-medium">Роль</th>
                <th className="text-right px-5 py-3 text-gray-400 text-sm font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-gray-700/30 hover:bg-gray-700/20">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-gray-400" />
                      </div>
                      <span className="text-white">{u.username}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-400">{u.email}</td>
                  <td className="px-5 py-3"><RoleBadge role={u.role} /></td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleEdit(u)}
                        className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all" title="Редактировать">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(u.id)}
                        className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-all" title="Удалить">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
