<?php
/**
 * Единая точка входа REST API: /api/<ресурс>[/<действие>]
 * Маршрутизация без .htaccess (для `php -S localhost:8080 -t server`, index.php в /api).
 */

declare(strict_types=1);

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
// Отрезаем префикс /api и ведущие/замыкающие слэши.
$segments = array_values(array_filter(explode('/', preg_replace('#^/api#', '', $path) ?? ''), fn($s) => $s !== ''));

$resource = $segments[0] ?? '';

if ($resource === '' && ($_GET['resource'] ?? '') !== '') {
    // Фолбэк для встроенного сервера PHP без rewrite: /api/index.php?resource=auth&action=login
    $resource = (string) $_GET['resource'];
}

switch ($resource) {
    case 'auth':
        if (!isset($_GET['action']) && isset($segments[1])) {
            $_GET['action'] = $segments[1];
        }
        require __DIR__ . '/auth.php';
        break;
    case 'users':
        require __DIR__ . '/users.php';
        break;
    case 'reports':
        // /api/reports/logs -> ?logs=1
        if (isset($segments[1]) && $segments[1] === 'logs') {
            $_GET['logs'] = '1';
        }
        require __DIR__ . '/reports.php';
        break;
    default:
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(404);
        echo json_encode(['error' => 'Эндпоинт не найден'], JSON_UNESCAPED_UNICODE);
}
