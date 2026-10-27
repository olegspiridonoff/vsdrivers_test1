<?php
/**
 * /api/reports — недельные отчёты и журнал изменений (серверный RBAC).
 * GET    /api/reports            -> WeeklyReport[]  (driver видит только свои)
 * GET    /api/reports/logs       -> ReportEditLog[]
 * POST   /api/reports            { user_id, year, week_number, ... } -> { success }
 * PATCH  /api/reports?id=:id     { ...поля, changed_by_user_id } -> { success }
 * DELETE /api/reports?id=:id     -> { success }
 * Выплата total_driver_payout пересчитывается НА СЕРВЕРЕ (calculate_driver_payout),
 * клиентское значение игнорируется — защита от подмены суммы.
 */

declare(strict_types=1);
require __DIR__ . '/_bootstrap.php';

$me = authenticate();
$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int) $_GET['id'] : null;

function shape_report(array $r): array
{
    return [
        'id' => (string) $r['id'],
        'user_id' => (string) $r['user_id'],
        'year' => (int) $r['year'],
        'week_number' => (int) $r['week_number'],
        'wheely_gross' => (float) $r['wheely_gross'],
        'yandex_gross' => (float) $r['yandex_gross'],
        'own_rent_gross' => (float) $r['own_rent_gross'],
        'hourly_rent_hours' => (float) $r['hourly_rent_hours'],
        'compensations' => (float) $r['compensations'],
        'bonuses' => (float) $r['bonuses'],
        'deductions' => (float) $r['deductions'],
        'total_driver_payout' => (float) $r['total_driver_payout'],
        'created_at' => str_replace(' ', 'T', (string) $r['created_at']) . 'Z',
        'updated_at' => str_replace(' ', 'T', (string) $r['updated_at']) . 'Z',
    ];
}

function shape_log(array $l): array
{
    return [
        'id' => (string) $l['id'],
        'report_id' => (string) $l['report_id'],
        'changed_by_user_id' => (string) $l['changed_by_user_id'],
        'field_name' => $l['field_name'],
        'old_value' => (string) ($l['old_value'] ?? ''),
        'new_value' => (string) ($l['new_value'] ?? ''),
        'changed_at' => str_replace(' ', 'T', (string) $l['changed_at']) . 'Z',
    ];
}

/** Числовые поля отчёта из тела запроса с дефолтом 0. */
function numeric_fields(array $d): array
{
    $keys = ['wheely_gross', 'yandex_gross', 'own_rent_gross', 'hourly_rent_hours',
             'compensations', 'bonuses', 'deductions'];
    $out = [];
    foreach ($keys as $k) {
        $out[$k] = isset($d[$k]) ? (float) $d[$k] : 0.0;
    }
    return $out;
}

switch ($method) {
    case 'GET': {
        if (isset($_GET['logs'])) {
            if ($me['role'] === 'driver') {
                $stmt = db()->prepare(
                    'SELECT l.* FROM report_edit_logs l
                     JOIN weekly_reports r ON r.id = l.report_id
                     WHERE r.user_id = ?
                     ORDER BY l.changed_at DESC'
                );
                $stmt->execute([$me['id']]);
            } else {
                $stmt = db()->query('SELECT * FROM report_edit_logs ORDER BY changed_at DESC');
            }
            json_out(array_map('shape_log', $stmt->fetchAll()));
        }
        if ($me['role'] === 'driver') {
            $stmt = db()->prepare('SELECT * FROM weekly_reports WHERE user_id = ? ORDER BY year DESC, week_number DESC');
            $stmt->execute([$me['id']]);
        } else {
            $stmt = db()->query('SELECT * FROM weekly_reports ORDER BY year DESC, week_number DESC');
        }
        json_out(array_map('shape_report', $stmt->fetchAll()));
    }

    case 'POST': {
        // Водитель создаёт отчёт только за себя; менеджер/админ — за любого.
        $d = body();
        $userId = (int) ($d['user_id'] ?? 0);
        if ($me['role'] === 'driver') {
            $userId = (int) $me['id'];
        } elseif (!in_array($me['role'], ['manager', 'admin'], true)) {
            fail(403, 'Недостаточно прав');
        }
        $year = (int) ($d['year'] ?? 0);
        $week = (int) ($d['week_number'] ?? 0);
        if ($year < 2000 || $year > 2100 || $week < 1 || $week > 53) {
            fail(422, 'Некорректный год или номер недели');
        }
        $n = numeric_fields($d);
        $payout = calculate_driver_payout(
            $n['wheely_gross'], $n['yandex_gross'], $n['own_rent_gross'],
            $n['hourly_rent_hours'], $n['compensations'], $n['bonuses'], $n['deductions']
        );

        $dup = db()->prepare('SELECT id FROM weekly_reports WHERE user_id = ? AND year = ? AND week_number = ?');
        $dup->execute([$userId, $year, $week]);
        if ($dup->fetch()) fail(409, 'Отчёт за эту неделю уже существует');

        $ins = db()->prepare(
            'INSERT INTO weekly_reports
             (user_id, year, week_number, wheely_gross, yandex_gross, own_rent_gross,
              hourly_rent_hours, compensations, bonuses, deductions, total_driver_payout)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $ins->execute([
            $userId, $year, $week,
            $n['wheely_gross'], $n['yandex_gross'], $n['own_rent_gross'],
            $n['hourly_rent_hours'], $n['compensations'], $n['bonuses'],
            $n['deductions'], $payout,
        ]);
        json_out(['success' => true], 201);
    }

    case 'PATCH': {
        if ($id === null) fail(422, 'Не указан id отчёта');
        require_role($me, 'manager', 'admin'); // редактировать чужие отчёты могут только manager/admin

        $stmt = db()->prepare('SELECT * FROM weekly_reports WHERE id = ?');
        $stmt->execute([$id]);
        $old = $stmt->fetch();
        if (!$old) fail(404, 'Отчёт не найден');

        $d = body();
        $n = numeric_fields($d);
        $payout = calculate_driver_payout(
            $n['wheely_gross'], $n['yandex_gross'], $n['own_rent_gross'],
            $n['hourly_rent_hours'], $n['compensations'], $n['bonuses'], $n['deductions']
        );

        $changerId = (int) ($d['changed_by_user_id'] ?? $me['id']);
        // Журналируем изменения по каждому полю (как в mock-репозитории фронта).
        $logStmt = db()->prepare(
            'INSERT INTO report_edit_logs (report_id, changed_by_user_id, field_name, old_value, new_value)
             VALUES (?, ?, ?, ?, ?)'
        );
        $newValues = $n;
        $newValues['total_driver_payout'] = $payout;
        foreach (REPORT_LOG_FIELDS as $field) {
            if (array_key_exists($field, $newValues) && (float) $old[$field] !== $newValues[$field]) {
                $logStmt->execute([$id, $changerId, $field, (string) $old[$field], (string) $newValues[$field]]);
            }
        }

        $upd = db()->prepare(
            'UPDATE weekly_reports SET wheely_gross = ?, yandex_gross = ?, own_rent_gross = ?,
             hourly_rent_hours = ?, compensations = ?, bonuses = ?, deductions = ?,
             total_driver_payout = ?, updated_at = NOW() WHERE id = ?'
        );
        $upd->execute([
            $n['wheely_gross'], $n['yandex_gross'], $n['own_rent_gross'],
            $n['hourly_rent_hours'], $n['compensations'], $n['bonuses'],
            $n['deductions'], $payout, $id,
        ]);
        json_out(['success' => true]);
    }

    case 'DELETE': {
        if ($id === null) fail(422, 'Не указан id отчёта');
        require_role($me, 'admin'); // удаление — только администратор
        $del = db()->prepare('DELETE FROM weekly_reports WHERE id = ?');
        $del->execute([$id]);
        json_out(['success' => true]);
    }

    default:
        fail(405, 'Недопустимый метод для /api/reports');
}
