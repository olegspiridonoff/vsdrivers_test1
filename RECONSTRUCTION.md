# Реконструкция кода репозитория «ТаксиУчёт»

Дата анализа: 27.10.2026
Ветка: `qwen-code-cd5c42b6-fd0b-4527-92c4-4a37cc255f78` (HEAD, чистое рабочее дерево)

---

## 1. Общая характеристика проекта

**ТаксиУчёт** — SPA-приложение на React + TypeScript для еженедельного учёта доходов
и расходов водителей такси с ролевой моделью (водитель / руководитель / администратор),
аналитикой (Chart.js), аудит-логированием изменений и экспортом в CSV.

Текущая версия работает полностью на клиенте: роль БД эмулируется через `localStorage`.
PHP+MySQL-бэкенд (см. README и `public/database.sql`) существует только как план развёртывания —
PHP-код в репозитории отсутствует (только SQL-схема и примеры в комментариях).

### Стек (фактически используемый)
| Слой | Технологии |
|------|-----------|
| UI | React 18, TypeScript 5.7 (strict), Tailwind CSS v4 (`@tailwindcss/vite`), lucide-react |
| Графики | chart.js v4 (прямое использование API, без обёрток) |
| Сборка | Vite 6 (`@vitejs/plugin-react`), dev-сервер на порту 3000 |
| Хранилище | localStorage (ключи `taxi_users`, `taxi_session`, `taxi_reports`, `taxi_edit_logs`) |

### Структура (~1 870 строк кода)
```
index.html                     точка входа
vite.config.js                 конфигурация Vite + Tailwind
tsconfig.json                  strict-конфиг TS (noEmit)
package.json                   скрипты: dev / build / typecheck
public/database.sql            MySQL-схема для будущего PHP-бэкенда
src/main.tsx                   bootstrap ReactDOM.createRoot
src/index.css                  @import tailwindcss + базовые стили тёмной темы
src/App.tsx                    корневой Layout: сайдбар (desktop), шапка (mobile), роутинг по useState
src/types/index.ts             User, WeeklyReport, ReportEditLog, Role, AuthState
src/utils/calculations.ts      формула выплаты, ISO-недели, форматтеры, hashPassword, exportToCSV
src/utils/demoData.ts          генерация демо-отчётов за 8 недель для driver_1/driver_2
src/contexts/AuthContext.tsx   регистрация/вход/выход, CRUD пользователей (localStorage)
src/contexts/DataContext.tsx   CRUD отчётов + аудит-логи при изменении полей
src/pages/LoginPage.tsx        форма входа/регистрации, список демо-аккаунтов
src/pages/DashboardPage.tsx    KPI-карточки, топ-5 водителей
src/pages/ReportsPage.tsx      список отчётов, форма создания/редактирования, история изменений
src/pages/AnalyticsPage.tsx    линейный/кольцевой/стековый графики, фильтры, экспорт CSV
src/pages/UsersPage.tsx        таблица пользователей, создание/редактирование/удаление
```

---

## 2. Архитектура и поток данных

```
App ── AuthProvider ── DataProvider ── AppContent
                                        │ user == null → LoginPage
                                        │ user != null → Layout + currentPage:
                                        │   dashboard | reports | analytics | admin-only users
```

- Навигация реализована через `useState<Page>` в `AppContent` (зависимость `react-router-dom`
  в package.json не используется в коде).
- RBAC реализован на уровне UI: фильтрация пунктов меню и кнопок по `user.role`
  (права соответствуют таблице из README).
- Бизнес-формула централизована в `calculateDriverPayout`:
  `Итого = Wheely×0.30 + Яндекс×0.35 + Собств.аренда×0.30 + Часы×500 + Компенсации + Бонусы − Вычеты`.
- Аудит: `DataContext.updateReport` сравнивает 8 числовых полей и пишет построчные
  `ReportEditLog` (кто/когда/что/старое→новое); история отображается в `ReportsPage`.
- Уникальность отчёта: один отчёт на связку `(user_id, year, week_number)` — проверяется
  в `addReport` (аналог UNIQUE-ключа `unique_user_year_week` из database.sql).

---

## 3. Результаты проверки работоспособности

| Проверка | Команда | Результат |
|----------|---------|-----------|
| Установка зависимостей | `npm install` | ✅ успешно |
| Типизация | `npm run typecheck` (tsc --noEmit, strict) | ✅ 0 ошибок |
| Прод-сборка | `npm run build` | ✅ 1367 модулей, dist ~406 KB JS / ~27 KB CSS |

Код функционально целостен и собирается без ошибок.

---

## 4. Выявленные проблемы (аудит реконструкции)

### P1 — Мёртвые зависимости (раздувание bundle и lockfile)
В `package.json` объявлены, но **нигде не импортируются** в `src/`:
`@supabase/supabase-js`, `@dnd-kit/*` (3 пакета), `recharts`, `framer-motion`,
`date-fns`, `canvas-confetti` + `@types/canvas-confetti`, `uuid` + `@types/uuid`,
`react-router-dom`. Фактически используются только: react, react-dom, chart.js,
lucide-react, tailwindcss, vite, typescript.

### P2 — Дублирование логики и стилей
- Формула выплаты продублирована в 3 местах: `calculations.ts`, `demoData.ts`
  (ручной расчёт `total_driver_payout`), плюс константы 0.30/0.35/0.30/500 захардкожены
  в `DashboardPage`, `AnalyticsPage` (графики) и `ReportsPage` (подсказки в форме).
- Классы input/select (`"w-full px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg
  text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50..."`) повторяются ~20 раз.
- Расчёт «текущей недели» продублирован в `demoData.ts` и `ReportsForm` вместо вызова `getWeekNumber()`.
- Два отдельных импорта из `../utils/calculations` в `AnalyticsPage.tsx`.

### P3 — Небезопасные/ненадёжные практики
- `hashPassword` — демонстрационный хэш (djb2-подобный), непригоден для продакшена
  (задокументировано; для PHP-версии предписан `password_hash()`).
- Прямое `JSON.parse(localStorage…)` без try/catch — повреждённые данные «роняют» приложение.
- Везде `.substr()` (deprecated) вместо `.substring()/slice()`.
- Нет реактивной синхронизации: `DashboardPage`/`ReportsPage` читают пользователей через
  `getAllUsers()` во время рендера; после изменения профиля/сессии списки могут быть устаревшими.
- `React` импортируется во всех файлах при `jsx: react-jsx` (автономтия) — лишний шум.

### P4 — Прочее
- Годы в форме отчёта захардкожены `[2024, 2025, 2026]` — пройдут мимо следующего года.
- `exportToCSV(reports: any[], users: any[])` теряет типизацию.
- `AuthState` в `types/index.ts` нигде не используется.
- `generateId()` не гарантирует уникальность при быстрых последовательных вызовах
  (Date.now()+Math.random) — для localStorage приемлемо, но лучше `crypto.randomUUID()`.

---

## 5. План реконструкции (рекомендации)

### Этап 1 — Очистка (низкий риск) ✅ ВЫПОЛНЕН
1. ✅ Удалено 12 неиспользуемых зависимостей (`@dnd-kit/*`, `@supabase/supabase-js`,
   `canvas-confetti`, `react-chartjs-2`, `date-fns`, `framer-motion`, `recharts`, `uuid`,
   `react-router-dom`, `@types/canvas-confetti`, `@types/uuid`), lockfile перегенерирован;
   node_modules сократился со 101 до 59 пакетов. Оставлены только используемые:
   `chart.js`, `lucide-react`, `react`, `react-dom`.
2. ✅ Устаревший `String.prototype.substr()` убран полностью: генерация ID вынесена в
   новый модуль `src/utils/id.ts` на базе `crypto.randomUUID()` (с фолбэком на `slice`);
   `generateId()` удалён из `calculations.ts`, обновлены импорты в `AuthContext`,
   `DataContext`, `demoData`.
3. ✅ Избыточные `import React` удалены из 5 файлов (jsx-runtime), включая `main.tsx`.
4. ✅ Неиспользуемый тип `AuthState` удалён из `src/types/index.ts`.
Проверки: `npm run typecheck` и `npm run build` — успешно (бандл 406 kB / gzip 131 kB).

### Этап 2 — Централизация домена (средний риск) — ✅ ВЫПОЛНЕНО
1. ✅ Введены константы тарифов `PAYOUT_RATES` в `src/utils/calculations.ts`
   (`wheelyShare: 0.30`, `yandexShare: 0.35`, `ownRentShare: 0.30`, `hourlyRentRate: 500`);
   все инлайн-умножения заменены: `calculateDriverPayout` принимает объект `PayoutInput`,
   добавлен селектор `payoutBySource(report)` (разложение по источникам), который используют
   DashboardPage, AnalyticsPage (pie/bar-графики) и ReportsPage (подсказки в форме);
   demoData больше не дублирует формулу, а вызывает `calculateDriverPayout`.
   Формула даёт идентичный результат (золотая проверка: old === new).
2. ✅ Список годов генерируется из текущей даты: `getAvailableYears()` (текущий ± 2),
   захардкоженный `[2024, 2025, 2026]` удалён; номер недели в ReportsPage/demoData
   считается через единый `getWeekNumber()`.
3. ✅ Безопасный хелпер `readJSON<T>(key, fallback)` (аналог `safeParse`) в новом модуле
   `src/utils/storage.ts`: все ключи localStorage централизованы в `STORAGE_KEYS`
   (`users`, `session`, `reports`, `editLogs`), контексты и утилиты больше не обращаются
   к `localStorage`/`JSON.parse` напрямую; повреждённые данные не роняют приложение.
Проверки: `npm run typecheck` и `npm run build` — успешно (бандл 406 kB / gzip 131 kB).

### Этап 3 — UI-компонентизация (средний риск)
1. ✅ Вынесены примитивы в `src/components/ui/primitives.tsx`: `<Field label>`, `<TextInput/>`,
   `<SelectInput options>`, `<Card>`, `<RoleBadge role>` (+ `roleLabel`, `EmptyState`, `Alert`);
   заменены дублирующиеся инлайновые стили полей/бейджей в UsersPage, ReportsPage, LoginPage.
2. ✅ Состояние пользователей поднято в `AuthContext` как реактивный `users: User[]`
   (единая точка записи `persistUsers` обновляет state + localStorage при register/update/delete);
   `getAllUsers()` удалён — все потребители (Dashboard, Reports, Analytics, Users) читают `users`.
3. ✅ `ReportsPage` разделён на `src/components/reports/ReportForm.tsx` (с типом `ReportDraft`
   вместо `data: any`), `ReportList.tsx` и `EditHistory.tsx` (с локальным состоянием раскрытия
   истории для каждого отчёта вместо общего `expandedLogs`).
Проверки: `npm run typecheck` и `npm run build` — успешно (бандл 405 kB / gzip 132 kB).

### Этап 4 — Портирование на заявленный бэкенд (по README)
1. Создать слой `src/api/*` (fetch-клиент) с теми же контрактами, что Context-ы,
   чтобы замена localStorage → REST была локальной.
2. Реализовать `/api/auth`, `/api/reports`, `/api/users` на PHP+PDO по схеме `database.sql`
   (prepared statements, `password_hash`, серверная проверка RBAC — сейчас права только в UI).

### Критерии приёмки
- `npm run typecheck && npm run build` — зелёные на каждом этапе;
- поведение демо-аккаунтов и формулы выплаты не меняется (золотые тесты на `calculateDriverPayout`);
- размер бандла снижается после этапа 1 (chart.js остаётся единственным тяжёлым лоадом).
