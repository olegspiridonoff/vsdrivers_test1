import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Car, Mail, User } from 'lucide-react';
import { Alert, IconField, PasswordField } from '../components/ui/primitives';

export default function LoginPage() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (isRegister) {
      const result = register(username, email, password, 'driver');
      if (!result.success) {
        setError(result.error || 'Ошибка регистрации');
      } else {
        setSuccess('Регистрация успешна! Теперь войдите.');
        setIsRegister(false);
        setUsername('');
      }
    } else {
      const result = login(email, password);
      if (!result.success) {
        setError(result.error || 'Ошибка входа');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/20 mb-4">
            <Car className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">ТаксиУчёт</h1>
          <p className="text-gray-400 mt-2">Еженедельный учёт доходов и расходов</p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-6">
            {isRegister ? 'Регистрация' : 'Вход в систему'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <IconField
                icon={<User />}
                type="text"
                placeholder="Имя пользователя"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
            )}

            <IconField
              icon={<Mail />}
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />

            <PasswordField
              showPassword={showPassword}
              onToggle={() => setShowPassword(v => !v)}
              placeholder="Пароль"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />

            <Alert kind="error" message={error} />
            <Alert kind="success" message={success} />

            <button
              type="submit"
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-amber-500/20"
            >
              {isRegister ? 'Зарегистрироваться' : 'Войти'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => { setIsRegister(!isRegister); setError(''); setSuccess(''); }}
              className="text-amber-400 hover:text-amber-300 text-sm transition-colors"
            >
              {isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-700/50">
            <p className="text-gray-500 text-xs text-center mb-3">Демо-аккаунты:</p>
            <div className="space-y-1 text-xs text-gray-400">
              <p><span className="text-amber-400">Admin:</span> admin@taxi.ru / admin123</p>
              <p><span className="text-amber-400">Manager:</span> manager@taxi.ru / manager123</p>
              <p><span className="text-amber-400">Driver:</span> driver1@taxi.ru / driver123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
