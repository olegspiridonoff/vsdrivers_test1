# Деплой «ТаксиУчёт» на локальный IIS + PHP + MySQL (Windows)

Инструкция для Windows 10/11 Pro или Windows Server. Итог: приложение доступно по адресу `http://localhost:8080`, фронтенд (React SPA из `dist/`) и REST API (PHP из `server/api/`) обслуживаются одним сайтом IIS, данные хранятся в MySQL.

Целевая структура сайта:

```
C:\inetpub\taxi\              ← корень сайта IIS
├── web.config                ← rewrite-правила (файл лежит в корне репозитория)
├── index.html                ← собранный фронтенд (из dist/)
├── assets\                   ← JS/CSS-бандлы Vite
└── api\                      ← копия папки server/api из репозитория
    ├── index.php             ← единая точка входа REST API
    ├── _bootstrap.php         ← БД, RBAC, токены
    ├── auth.php / users.php / reports.php
    └── .htaccess             ← не нужен на IIS (для Apache), можно не копировать
```

---

## 0. Требования

| Компонент | Версия | Где взять |
|---|---|---|
| PHP | 8.1+ **NTS x64** | https://windows.php.net/download/ (zip «VS16 x64 Non Thread Safe») |
| Visual C++ Redistributable 2015-2022 | x64 | https://aka.ms/vs/17/release/vc_redist.x64.exe |
| URL Rewrite for IIS | 2.1 | https://www.iis.net/downloads/microsoft/url-rewrite (x64 msi) |
| MySQL Community Server | 8.0+ | https://dev.mysql.com/downloads/installer/ |
| Node.js | 18+ (только для сборки фронта) | https://nodejs.org |

Все команды — в **PowerShell от имени администратора**. Путь к клонированному репозиторию далее — `C:\src\taxi` (замените на свой).

---

## 1. Включить IIS (с CGI)

GUI: Win+R → `optionalfeatures` → «Компоненты Windows» → «Средства и службы Интернета (IIS)»:

- Общие функции веб-сервера → **Статическое содержимое**, **Документ по умолчанию**;
- Средства разработки → **Сценарии и инструменты CGI**;
- Безопасность → **Фильтрация запросов**;
- Службы IIS → Управление → **Консоль управления IIS**.

Или командой:

```powershell
Enable-WindowsOptionalFeature -Online -FeatureName `
  IIS-WebServerRole, IIS-WebServer, IIS-CommonHttpFeatures, IIS-StaticContent, `
  IIS-DefaultDocument, IIS-Security, IIS-RequestFiltering, IIS-ApplicationDevelopment, `
  IIS-CGI, IIS-WebServerManagementTools, IIS-ManagementConsole -All
```

Проверка: `http://localhost` отдаёт страницу «IIS Windows Server».

---

## 2. Установить PHP (FastCGI)

2.1. Распакуйте zip PHP в `C:\php`:

```powershell
Expand-Archive .\php-8.3.*-nts-Win32-VS16-x64.zip -DestinationPath C:\php
```

> Важно: именно **NTS** (Non Thread Safe) — потокобезопасная сборка с FastCGI в IIS не работает. Перед запуском установите `vc_redist.x64.exe`.

2.2. Настройка `php.ini`:

```powershell
Copy-Item C:\php\php.ini-production C:\php\php.ini
notepad C:\php\php.ini
```

Найдите и раскомментируйте (уберите `;`) строки:

```ini
extension_dir = "C:\php\ext"
cgi.fix_pathinfo = 1
extension=pdo_mysql
extension=mbstring
extension=openssl
extension=curl
extension=fileinfo
```

Проверка CLI:

```powershell
C:\php\php.exe -m | Select-String pdo_mysql   # должно вывести pdo_mysql
```

2.3. Зарегистрируйте PHP в IIS:

Откройте `inetmgr` → узел сервера (верх дерева) → **Сопоставления обработчиков (Handler Mappings)** → справа **Add Module Mapping…**:

| Поле | Значение |
|---|---|
| Request path | `*.php` |
| Module | `FastCgiModule` |
| Executable | `C:\php\php-cgi.exe` |
| Name | `PHP via FastCGI` |

OK → «Allow extension path to execute?» → **Yes**.

2.4. Проверка:

```powershell
Set-Content C:\inetpub\wwwroot\info.php "<?php phpinfo();"
```

Открыть `http://localhost/info.php` — должна быть таблица конфигурации (секции `pdo_mysql`, `mbstring`). Затем удалите файл: `Remove-Item C:\inetpub\wwwroot\info.php`.

---

## 3. Установить модуль URL Rewrite

Без него правила из `web.config` не работают → 404 на `/api/*` и не работает SPA-роутинг.

Скачайте и установите **URL Rewrite 2.1 x64** (msi): https://www.iis.net/downloads/microsoft/url-rewrite

Проверка: в `inetmgr` на уровне сервера появился значок **URL Rewrite**. После установки выполните `iisreset`.

---

## 4. Установить и настроить MySQL

4.1. Установка MySQL Installer: тип **Server only**, порт `3306`, пароль root задайте свой (далее используется `RootPassw0rd!`).

4.2. Создайте базу и пользователя приложения:

```powershell
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS taxi_accounting CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p -e "CREATE USER IF NOT EXISTS 'taxi'@'localhost' IDENTIFIED BY 'TaxiPassw0rd!'; GRANT ALL PRIVILEGES ON taxi_accounting.* TO 'taxi'@'localhost'; FLUSH PRIVILEGES;"
```

4.3. Импортируйте схему из репозитория (`database.sql` сам создаёт/использует БД `taxi_accounting`; файлы лежат в `public/`):

```powershell
cd C:\src\taxi
mysql -u root -p < public\database.sql
```

4.4. Примените дополнение этапа 4 (таблица `auth_tokens` + bcrypt-хэши демо-паролей):

```powershell
mysql -u root -p < public\schema_api_additions.sql
```

⚠️ В `schema_api_additions.sql` два хэша — заглушки (manager123, driver123). Сгенерируйте настоящие и выполните UPDATE вручную:

```powershell
C:\php\php.exe -r "echo password_hash('manager123', PASSWORD_DEFAULT), PHP_EOL;"
C:\php\php.exe -r "echo password_hash('driver123',  PASSWORD_DEFAULT), PHP_EOL;"
```

```sql
-- mysql -u taxi -p taxi_accounting
UPDATE users SET password_hash='<хэш manager123>' WHERE email='manager@taxi.ru';
UPDATE users SET password_hash='<хэш driver123>' WHERE email IN ('driver1@taxi.ru','driver2@taxi.ru');
```

(Хэш для `admin@taxi.ru` уже настоящий — пароль `admin123`.)

4.5. Проверка:

```powershell
mysql -u taxi -p taxi_accounting -e "SHOW TABLES;"
# users, weekly_reports, report_edit_logs, auth_tokens
```

---

## 5. Сборка фронтенда

```powershell
cd C:\src\taxi
npm install --yes
npm run build          # результат в dist\
```

Никаких переменных окружения задавать не нужно: `src/api/client.ts` при отсутствии `VITE_API_URL` использует относительный путь `/api` — фронт и API на одном origin, CORS не требуется.

> Если планируете раздавать API с другого адреса (например, отдельный сайт), соберите с `set VITE_API_URL=http://localhost:8080/api && npm run build`.

---

## 6. Публикация сайта в IIS

6.1. Скопируйте файлы:

```powershell
New-Item -ItemType Directory -Force C:\inetpub\taxi | Out-Null

# фронтенд (index.html, assets/, ...)
Copy-Item .\dist\* C:\inetpub\taxi\ -Recurse -Force

# web.config лежит в КОРНЕ репозитория (не в dist!)
Copy-Item .\web.config C:\inetpub\taxi\web.config -Force

# бэкенд: содержимое server\api -> C:\inetpub\taxi\api
Copy-Item .\server\api C:\inetpub\taxi\api -Recurse -Force
```

Проверьте итоговую структуру:

```powershell
Get-ChildItem C:\inetpub\taxi            # web.config, index.html, assets, api
Test-Path C:\inetpub\taxi\api\index.php  # True
```

6.2. Создайте сайт: `inetmgr` → **Sites** → **Add Website…**

| Поле | Значение |
|---|---|
| Site name | `taxi` |
| Application pool | создайте новый `taxi-pool` (.NET CLR version: **No Managed Code**) |
| Physical path | `C:\inetpub\taxi` |
| Binding | type http, port **8080** (порт 80 занят Default Web Site) |

CLI-альтернатива:

```powershell
New-WebAppPool -Name taxi-pool
(Get-Item IIS:\AppPools\taxi-pool).managedRuntimeVersion = ""
New-Website -Name taxi -PhysicalPath C:\inetpub\taxi -ApplicationPool taxi-pool -Port 8080
```

6.3. Права на запись (если понадобится — логи PHP во временной папке):

```powershell
icacls C:\inetpub\taxi\api /grant "IIS AppPool\taxi-pool:(OI)(CI)RX" /T
```

6.4. Убедитесь, что сайт taxi → **Default Document** содержит `index.html` (добавьте сверху списка, если нет).

---

## 7. Параметры подключения к БД

Бэкенд (`server/api/_bootstrap.php`) читает переменные окружения процесса пула приложений: `DB_DSN`, `DB_USER`, `DB_PASS` (дефолты: `mysql:host=localhost;dbname=taxi_accounting;charset=utf8mb4`, `root`, пустой).

Задайте их для пула `taxi-pool` (в инструкции использованы пользователи/пароли из шага 4.2 — замените на свои):

```powershell
Import-Module WebAdministration
Set-ItemProperty "IIS:\AppPools\taxi-pool" -Name processModel.environmentVariables.Value `
  -Value @{
    DB_DSN  = "mysql:host=127.0.0.1;dbname=taxi_accounting;charset=utf8mb4"
    DB_USER = "taxi"
    DB_PASS = "TaxiPassw0rd!"
  }
Restart-WebAppPool taxi-pool
```

Через GUI: `inetmgr` → **Application Pools** → taxi-pool → **Advanced Settings…** → **Environment Mode** → добавьте пары имя/значение.

> Локальная разработка без IIS использует те же переменные: `$env:DB_USER="taxi"; $env:DB_PASS="TaxiPassw0rd!"; php -S localhost:8080 -t server/api` (см. README).

---

## 8. Проверка работы

8.1. Health/API через браузер или PowerShell:

```powershell
Invoke-RestMethod http://localhost:8080/api/auth/login -Method Post -ContentType "application/json" `
  -Body '{"email":"admin@taxi.ru","password":"admin123"}'
# ожидаем JSON: { token: "...", user: {...} }
```

Если вместо JSON — HTML/404: проблема с URL Rewrite (шаг 3) или `web.config` не скопирован. Если 500 — см. шаг 10.

8.2. Полный смоук-тест цикла (login → создать отчёт → список):

```powershell
$login = Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/auth/login `
  -ContentType "application/json" -Body '{"email":"admin@taxi.ru","password":"admin123"}'
$hdr = @{ Authorization = "Bearer $($login.token)" }

Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/reports -Headers $hdr `
  -ContentType "application/json" `
  -Body '{"weekNumber":43,"year":2026,"wheelyGross":20000,"yandexGross":15000,"ownRentGross":5000,"hourlyRentHours":0,"compensations":0,"bonuses":0,"deductions":0,"totalDriverPayout":0}'

Invoke-RestMethod -Uri http://localhost:8080/api/reports -Headers $hdr   # список должен содержать созданный отчёт
```

8.3. UI: откройте `http://localhost:8080/` → войдите как `admin@taxi.ru / admin123` → проверьте дашборд, отчёты, аналитику, пользователей. Данные сохраняются в MySQL и переживают перезагрузку страницы.

8.4. Переходы по внутренним маршрутам SPA (F5 на `/reports`) не должны давать 404 — это работает правило «SPA fallback» из `web.config`.

---

## 9. Ежедневное использование

- Старт/стоп/перезапуск: `Restart-Website taxi`, `Restart-WebAppPool taxi-pool` или через `inetmgr`.
- Обновление фронтенда: `npm run build` → перескопировать `dist\*` в `C:\inetpub\taxi\` (папку `api` и `web.config` не трогать).
- Обновление бэкенда: перескопировать `server\api\*` в `C:\inetpub\taxi\api\` → `Restart-WebAppPool taxi-pool`.
- Смена паролей/пользователей: только через UI (роль admin) или SQL — хэши должны быть `password_hash()` (bcrypt), самописные клиентские хэши сервер не примет.

---

## 10. Устранение неполадок

| Симптом | Причина / решение |
|---|---|
| Белый экран / 500 на любом `/api/*`, в Event Viewer «FastCGI … unexpected exit» | Не установлен VC++ Redistributable, или скачан TS-вариант PHP вместо NTS (шаг 2) |
| `/api/auth/login` → 404 | Не установлен URL Rewrite (шаг 3); `web.config` отсутствует в корне сайта; проверьте `Test-Path C:\inetpub\taxi\api\index.php` |
| Ошибка «HTTP 500.19» при открытии сайта | Повреждённый/неполный `web.config` — убедитесь, что скопирован файл из корня репозитория целиком; после установки URL Rewrite выполните `iisreset` |
| `could not find driver` | В `php.ini` не раскомментирован `extension=pdo_mysql` (или неверный `extension_dir`); после правки — `iisreset` |
| «Недопустимый email или пароль» при верном пароле | Хэши в `users.password_hash` не bcrypt (шаг 4.4 — заменить заглушки); либо база не та: проверьте `SELECT email, LEFT(password_hash,7) FROM users;` — начало должно быть `$2y$10$` |
| «Database error» / access denied | Переменные окружения пула (шаг 7) не заданы или не перезапущен пул после задания; MySQL-служба запущена? (`Get-Service MySQL*`) |
| Запросы уходят не туда, где ожидается `/api` | Открываете `file://` или другой сайт — используйте `http://localhost:8080/` |
| Порт 8080 занят | `netstat -ano \| findstr :8080` → освободите или смените binding сайта |
| Нужны логи | IIS: `%SystemDrive%\inetpub\logs\LogFiles\W3SVC...`; PHP-ошибки: включите в `php.ini` `display_errors=On`/`log_errors=On` (только для отладки!) и смотрите указанный `error_log`; ответы API содержат поле `error` с текстом проблемы |

---

## 11. Быстрая шпаргалка (порядок действий)

```text
1.  optionalfeatures: IIS + CGI + Request Filtering
2.  PHP NTS x64 → C:\php (+ vc_redist.x64), php.ini: pdo_mysql, mbstring, openssl
3.  inetmgr: Handler Mapping *.php → C:\php\php-cgi.exe (FastCgiModule)
4.  Установить URL Rewrite 2.1 x64 → iisreset
5.  MySQL: импортировать public/database.sql, затем public/schema_api_additions.sql
    + сгенерировать bcrypt-хэши для manager123/driver123 (php -r password_hash)
6.  npm install && npm run build
7.  dist\* → C:\inetpub\taxi ; web.config → C:\inetpub\taxi ; server\api → C:\inetpub\taxi\api
8.  Сайт "taxi", пул taxi-pool (No Managed Code), порт 8080
9.  Env-переменные пула: DB_DSN / DB_USER / DB_PASS → Restart-WebAppPool
10. POST /api/auth/login (admin@taxi.ru/admin123) → token; открыть http://localhost:8080/
```
