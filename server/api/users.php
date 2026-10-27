<?php
/**
 * /api/users — только для администратора (серверный RBAC).
 * GET    /api/users          -> User[]
 * POST   /api/users          { username, email, password, role } -> { success }
 * PATCH  /api/users?id=:id   { username?, email?, role? } -> { success }
 * DELETE /api/users?id=:id   -> { success }
 * Ответы приводятся к форме фронтенда: id — строка, есть created_at/password_hash-поле.
 */

declare(strict_types=1);
require __DIR__ . '/_bootstrap.php';

$me = authenticate();
require_role($me, 'admin');

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int) $_GET['id'] : null;

function shape(array $u): array
{
    return [
        'id' => (string) $u['id'],
        'username' => $u['username'],
        'email' => $u['email'],
        'password_hash' => $u['password_hash'] ?? '',
        'role' => $u['role'],
        'created_at' => str_replace(' ', 'T', (string) $u['created_at']) . 'Z',
    ];
}

switch ($method) {
    case 'GET': {
        $rows = db()->query('SELECT * FROM users ORDER BY username')->fetchAll();
        json_out(array_map('shape', $rows));
    }

    case 'POST': {
        $d = body();
        $username = trim((string) ($d['username'] ?? ''));
        $email = trim((string) ($d['email'] ?? ''));
        $password = (string) ($d['password'] ?? '');
        $role = (string) ($d['role'] ?? 'driver');
        if ($username === '' || $email === '' || strlen($password) < 6) {
            fail(422, 'Заполните имя, email и пароль (минимум 6 символов)');
        }
        if (!in_array($role, ['driver', 'manager', 'admin'], true)) {
            fail(422, 'Недопустимая роль');
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

    case 'PATCH': {
        if ($id === null) fail(422, 'Не указан id пользователя');
        $d = body();
        $sets = [];
        $params = [];
        if (isset($d['username'])) { $sets[] = 'username = ?'; $params[] = trim((string) $d['username']); }
        if (isset($d['email']))    { $sets[] = 'email = ?';    $params[] = trim((string) $d['email']); }
        if (isset($d['role'])) {
            if (!in_array($d['role'], ['driver', 'manager', 'admin'], true)) fail(422, 'Недопустимая роль');
            $sets[] = 'role = ?';
            $params[] = $d['role'];
        }
        if (isset($d['password']) && strlen((string) $d['password']) >= 6) {
            $sets[] = 'password_hash = ?';
            $params[] = password_hash((string) $d['password'], PASSWORD_DEFAULT);
        }
        if (!$sets) fail(422, 'Нет изменений');
        $params[] = $id;
        $upd = db()->prepare('UPDATE users SET ' . implode(', ', $sets) . ' WHERE id = ?');
        $upd->execute($params);
        json_out(['success' => true]);
    }

    case 'DELETE': {
        if ($id === null) fail(422, 'Не указан id пользователя');
        if ($id === (int) $me['id']) fail(422, 'Нельзя удалить свой аккаунт');
        $del = db()->prepare('DELETE FROM users WHERE id = ?');
        $del->execute([$id]);
        json_out(['success' => true]);
    }

    default:
        fail(405, 'Недопустимый метод для /api/users');
}
