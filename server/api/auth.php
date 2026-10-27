<?php
/**
 * POST /api/auth/login   { email, password } -> { token, user }
 * POST /api/auth/register{ username, email, password, role } -> { success }
 * POST /api/auth/logout  (с токеном) -> { success }
 */

declare(strict_types=1);
require __DIR__ . '/_bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'POST' && $action === 'login') {
    $data = body();
    $email = trim((string) ($data['email'] ?? ''));
    $password = (string) ($data['password'] ?? '');
    if ($email === '' || $password === '') {
        fail(422, 'Укажите email и пароль');
    }

    $stmt = db()->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    // password_verify вместо самописного хэша на клиенте.
    if (!$user || !password_verify($password, $user['password_hash'])) {
        fail(401, 'Неверный email или пароль');
    }

    $token = bin2hex(random_bytes(32));
    $ins = db()->prepare(
        'INSERT INTO auth_tokens (user_id, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))'
    );
    $ins->execute([$user['id'], $token]);

    unset($user['password_hash']);
    json_out(['token' => $token, 'user' => $user]);
}

if ($method === 'POST' && $action === 'register') {
    $data = body();
    $username = trim((string) ($data['username'] ?? ''));
    $email = trim((string) ($data['email'] ?? ''));
    $password = (string) ($data['password'] ?? '');
    $role = (string) ($data['role'] ?? 'driver');

    if ($username === '' || $email === '' || strlen($password) < 6) {
        fail(422, 'Заполните имя, email и пароль (минимум 6 символов)');
    }
    // Саморегистрация всегда driver — повышение роли только через /api/users (admin).
    if (!in_array($role, ['driver', 'manager', 'admin'], true) || $role !== 'driver') {
        $role = 'driver';
    }

    $check = db()->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
    $check->execute([$email]);
    if ($check->fetch()) {
        fail(409, 'Email уже зарегистрирован');
    }

    $ins = db()->prepare('INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)');
    $ins->execute([$username, $email, password_hash($password, PASSWORD_DEFAULT), $role]);
    json_out(['success' => true], 201);
}

if ($method === 'POST' && $action === 'logout') {
    $token = bearer_token();
    if ($token) {
        $del = db()->prepare('DELETE FROM auth_tokens WHERE token = ?');
        $del->execute([$token]);
    }
    json_out(['success' => true]);
}

fail(405, 'Недопустимый метод или действие для /api/auth');
