<?php
/**
 * Общая инфраструктура REST API (bootstrap).
 * Подключается каждым эндпоинтом: require __DIR__ . '/_bootstrap.php';
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

// CORS для локальной разработки (Vite dev-server на другом порту).
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '') {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS');
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

const DB_DSN_DEFAULT = 'mysql:host=localhost;dbname=taxi_accounting;charset=utf8mb4';

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $dsn = getenv('DB_DSN') ?: DB_DSN_DEFAULT;
        $user = getenv('DB_USER') ?: 'root';
        $pass = getenv('DB_PASS') ?: '';
        $pdo = new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }
    return $pdo;
}

function json_out(array $data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/** Ошибка в формате, который понимает фронтенд (src/api/client.ts читает поле error). */
function fail(int $status, string $message): void
{
    json_out(['error' => $message], $status);
}

function body(): array
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '', true);
    return is_array($data) ? $data : [];
}

function bearer_token(): ?string
{
    $hdr = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (stripos($hdr, 'Bearer ') === 0) {
        return substr($hdr, 7);
    }
    // Apache иногда не пробрасывает заголовок Authorization.
    $alt = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (stripos($alt, 'Bearer ') === 0) {
        return substr($alt, 7);
    }
    return null;
}

/**
 * Аутентификация по токену из auth_tokens.
 * ВАЖНО: это серверная проверка — клиент больше не может выдать себя
 * за другого пользователя или подменить роль (закрытие уязвимости RBAC).
 */
function authenticate(): array
{
    $token = bearer_token();
    if ($token === null || $token === '') {
        fail(401, 'Требуется авторизация');
    }
    $stmt = db()->prepare(
        'SELECT u.* FROM auth_tokens t
         JOIN users u ON u.id = t.user_id
         WHERE t.token = ? AND t.expires_at > NOW()'
    );
    $stmt->execute([$token]);
    $user = $stmt->fetch();
    if (!$user) {
        fail(401, 'Сессия истекла, войдите заново');
    }
    return $user;
}

/** Серверная проверка прав (RBAC). Вызывается ДО любых мутаций. */
function require_role(array $user, string ...$roles): void
{
    if (!in_array($user['role'], $roles, true)) {
        fail(403, 'Недостаточно прав для этого действия');
    }
}

/** Поля отчёта, изменения которых журналируются (совпадает с фронтом и database.sql). */
const REPORT_LOG_FIELDS = [
    'wheely_gross', 'yandex_gross', 'own_rent_gross', 'hourly_rent_hours',
    'compensations', 'bonuses', 'deductions', 'total_driver_payout',
];

/**
 * Тарифы выплаты водителю. Единый источник истины на сервере —
 * значения совпадают с PAYOUT_RATES во фронтенде (src/utils/calculations.ts).
 */
function calculate_driver_payout(float $wheely, float $yandex, float $ownRent, float $hours,
                                 float $comp, float $bonus, float $deduction): float
{
    return round(
        $wheely * 0.30 +      // Wheely: 30%
        $yandex * 0.35 +      // Яндекс: 35%
        $ownRent * 0.30 +     // Собственная аренда: 30%
        $hours * 500 +        // Почасовая аренда: 500 ₽/час
        $comp + $bonus - $deduction,
        2
    );
}
