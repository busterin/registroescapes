<?php

declare(strict_types=1);

require __DIR__ . '/common.php';

const VALID_ROOMS = [
    'Frankie',
    'Magia',
    'Filosofal',
    'El regreso del vampiro',
];

const VALID_CATEGORIES = [
    '2a5p',
    '6p',
    '7p',
    '2a6(Filo)',
    '7 a 12(Filo)',
    'Guiado',
    'Merienda',
];

function detect_type(array $data): string
{
    $type = strtolower(trim((string)($data['type'] ?? 'session')));
    if ($type === 'expense') {
        return 'expense';
    }
    if ($type === 'monthly_real') {
        return 'monthly_real';
    }
    return 'session';
}

function validate_period(array $data): array
{
    $month = filter_var($data['month'] ?? null, FILTER_VALIDATE_INT);
    $year = filter_var($data['year'] ?? null, FILTER_VALIDATE_INT);

    if ($month === false || $month < 1 || $month > 12) {
        respond(['ok' => false, 'error' => 'Mes no valido'], 422);
    }

    if ($year === false || $year < 2000 || $year > 2100) {
        respond(['ok' => false, 'error' => 'Año no valido'], 422);
    }

    return ['month' => $month, 'year' => $year];
}

function validate_session_payload(array $data): array
{
    $period = validate_period($data);

    $room = trim((string)($data['room'] ?? ''));
    $category = trim((string)($data['category'] ?? ''));
    $sessions = filter_var($data['sessions'] ?? null, FILTER_VALIDATE_INT);
    $nightSession = filter_var($data['nightSession'] ?? false, FILTER_VALIDATE_BOOLEAN);
    $escapeUp = filter_var($data['escapeUp'] ?? false, FILTER_VALIDATE_BOOLEAN);
    $agency = filter_var($data['agency'] ?? false, FILTER_VALIDATE_BOOLEAN);

    if (!in_array($room, VALID_ROOMS, true)) {
        respond(['ok' => false, 'error' => 'Sala no valida'], 422);
    }

    if (!in_array($category, VALID_CATEGORIES, true)) {
        respond(['ok' => false, 'error' => 'Categoria no valida'], 422);
    }

    if ($sessions === false || $sessions < 0) {
        respond(['ok' => false, 'error' => 'Sesiones no validas'], 422);
    }

    return [
        'room' => $room,
        'category' => $category,
        'month' => $period['month'],
        'year' => $period['year'],
        'sessions' => $sessions,
        'nightSession' => $nightSession,
        'escapeUp' => $escapeUp,
        'agency' => $agency,
    ];
}

function validate_expense_payload(array $data): array
{
    $period = validate_period($data);
    $amount = filter_var($data['amount'] ?? null, FILTER_VALIDATE_FLOAT);

    if ($amount === false || $amount < 0) {
        respond(['ok' => false, 'error' => 'Importe de gasto no valido'], 422);
    }

    return [
        'month' => $period['month'],
        'year' => $period['year'],
        'amount' => round((float)$amount, 2),
    ];
}

function validate_monthly_real_payload(array $data): array
{
    $period = validate_period($data);
    $billingReal = filter_var($data['billingReal'] ?? null, FILTER_VALIDATE_FLOAT);
    $profitReal = filter_var($data['profitReal'] ?? null, FILTER_VALIDATE_FLOAT);

    if ($billingReal === false || $billingReal < 0) {
        respond(['ok' => false, 'error' => 'Facturación real no valida'], 422);
    }

    if ($profitReal === false) {
        respond(['ok' => false, 'error' => 'Beneficio real no valido'], 422);
    }

    return [
        'month' => $period['month'],
        'year' => $period['year'],
        'billingReal' => round((float)$billingReal, 2),
        'profitReal' => round((float)$profitReal, 2),
    ];
}

function has_column(PDO $pdo, string $table, string $column): bool
{
    static $cache = [];
    $key = $table . '.' . $column;

    if (array_key_exists($key, $cache)) {
        return $cache[$key];
    }

    try {
        $stmt = $pdo->prepare("SHOW COLUMNS FROM {$table} LIKE :column");
        $stmt->execute(['column' => $column]);
        $cache[$key] = $stmt->fetch() !== false;
    } catch (Throwable $e) {
        $cache[$key] = false;
    }

    return $cache[$key];
}

function has_table(PDO $pdo, string $table): bool
{
    static $cache = [];
    if (array_key_exists($table, $cache)) {
        return $cache[$table];
    }

    try {
        $stmt = $pdo->prepare(
            'SELECT COUNT(*) AS total
             FROM information_schema.tables
             WHERE table_schema = DATABASE()
               AND table_name = :table'
        );
        $stmt->execute(['table' => $table]);
        $total = (int)($stmt->fetchColumn() ?: 0);
        $cache[$table] = $total > 0;
    } catch (Throwable $e) {
        $cache[$table] = false;
    }

    return $cache[$table];
}

function fetch_session_record(PDO $pdo, int $id): ?array
{
    $withModifiers = has_column($pdo, 'registros_sesiones', 'nocturna');
    $select = $withModifiers
        ? 'SELECT id, sala, categoria, mes, anio, sesiones, nocturna, escape_up, agencia, created_at, updated_at
           FROM registros_sesiones
           WHERE id = :id'
        : 'SELECT id, sala, categoria, mes, anio, sesiones, created_at, updated_at
           FROM registros_sesiones
           WHERE id = :id';

    $stmt = $pdo->prepare($select);
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();

    if ($row === false) {
        return null;
    }

    $row['kind'] = 'session';
    return $row;
}

function fetch_expense_record(PDO $pdo, int $id): ?array
{
    if (!has_table($pdo, 'gastos_registro')) {
        return null;
    }

    $stmt = $pdo->prepare(
        'SELECT id, mes, anio, importe, created_at, updated_at
         FROM gastos_registro
         WHERE id = :id'
    );
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();

    if ($row === false) {
        return null;
    }

    $row['kind'] = 'expense';
    return $row;
}

function fetch_monthly_real_record(PDO $pdo, int $id): ?array
{
    if (!has_table($pdo, 'facturacion_real_mensual')) {
        return null;
    }

    $stmt = $pdo->prepare(
        'SELECT id, mes, anio, facturacion_real, beneficio_real, created_at, updated_at
         FROM facturacion_real_mensual
         WHERE id = :id'
    );
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();

    if ($row === false) {
        return null;
    }

    $row['kind'] = 'monthly_real';
    return $row;
}

function list_all_records(PDO $pdo): array
{
    $records = [];
    $withModifiers = has_column($pdo, 'registros_sesiones', 'nocturna');

    $sqlSession = $withModifiers
        ? 'SELECT id, sala, categoria, mes, anio, sesiones, nocturna, escape_up, agencia, created_at, updated_at
           FROM registros_sesiones'
        : 'SELECT id, sala, categoria, mes, anio, sesiones, created_at, updated_at
           FROM registros_sesiones';

    $stmtSession = $pdo->query($sqlSession);
    foreach ($stmtSession->fetchAll() as $row) {
        $row['kind'] = 'session';
        $records[] = $row;
    }

    if (has_table($pdo, 'gastos_registro')) {
        $stmtExpense = $pdo->query(
            'SELECT id, mes, anio, importe, created_at, updated_at
             FROM gastos_registro'
        );
        foreach ($stmtExpense->fetchAll() as $row) {
            $row['kind'] = 'expense';
            $records[] = $row;
        }
    }

    if (has_table($pdo, 'facturacion_real_mensual')) {
        $stmtReal = $pdo->query(
            'SELECT id, mes, anio, facturacion_real, beneficio_real, created_at, updated_at
             FROM facturacion_real_mensual'
        );
        foreach ($stmtReal->fetchAll() as $row) {
            $row['kind'] = 'monthly_real';
            $records[] = $row;
        }
    }

    usort($records, static function (array $a, array $b): int {
        $at = strtotime((string)($a['created_at'] ?? '1970-01-01 00:00:00'));
        $bt = strtotime((string)($b['created_at'] ?? '1970-01-01 00:00:00'));
        if ($at === $bt) {
            return (int)($b['id'] ?? 0) <=> (int)($a['id'] ?? 0);
        }
        return $bt <=> $at;
    });

    return $records;
}

require_auth();

try {
    /** @var PDO $pdo */
    $pdo = require __DIR__ . '/db.php';
} catch (Throwable $e) {
    respond(['ok' => false, 'error' => 'Error de conexion a base de datos'], 500);
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    respond([
        'ok' => true,
        'records' => list_all_records($pdo),
    ]);
}

if ($method === 'POST') {
    $data = read_json_body();
    $type = detect_type($data);

    if ($type === 'expense') {
        if (!has_table($pdo, 'gastos_registro')) {
            respond(['ok' => false, 'error' => 'Falta la tabla gastos_registro. Ejecuta la migracion SQL.'], 500);
        }

        $payload = validate_expense_payload($data);
        $stmt = $pdo->prepare(
            'INSERT INTO gastos_registro (mes, anio, importe)
             VALUES (:mes, :anio, :importe)'
        );
        $stmt->execute([
            'mes' => $payload['month'],
            'anio' => $payload['year'],
            'importe' => $payload['amount'],
        ]);

        $id = (int)$pdo->lastInsertId();
        $record = fetch_expense_record($pdo, $id);
        respond(['ok' => true, 'record' => $record], 201);
    }

    if ($type === 'monthly_real') {
        if (!has_table($pdo, 'facturacion_real_mensual')) {
            respond(['ok' => false, 'error' => 'Falta la tabla facturacion_real_mensual. Ejecuta la migracion SQL.'], 500);
        }

        $payload = validate_monthly_real_payload($data);
        $stmt = $pdo->prepare(
            'INSERT INTO facturacion_real_mensual (mes, anio, facturacion_real, beneficio_real)
             VALUES (:mes, :anio, :facturacion_real, :beneficio_real)'
        );
        $stmt->execute([
            'mes' => $payload['month'],
            'anio' => $payload['year'],
            'facturacion_real' => $payload['billingReal'],
            'beneficio_real' => $payload['profitReal'],
        ]);

        $id = (int)$pdo->lastInsertId();
        $record = fetch_monthly_real_record($pdo, $id);
        respond(['ok' => true, 'record' => $record], 201);
    }

    $payload = validate_session_payload($data);
    $withModifiers = has_column($pdo, 'registros_sesiones', 'nocturna');

    if ($withModifiers) {
        $stmt = $pdo->prepare(
            'INSERT INTO registros_sesiones (sala, categoria, mes, anio, sesiones, nocturna, escape_up, agencia)
             VALUES (:sala, :categoria, :mes, :anio, :sesiones, :nocturna, :escape_up, :agencia)'
        );
        $stmt->execute([
            'sala' => $payload['room'],
            'categoria' => $payload['category'],
            'mes' => $payload['month'],
            'anio' => $payload['year'],
            'sesiones' => $payload['sessions'],
            'nocturna' => $payload['nightSession'] ? 1 : 0,
            'escape_up' => $payload['escapeUp'] ? 1 : 0,
            'agencia' => $payload['agency'] ? 1 : 0,
        ]);
    } else {
        $stmt = $pdo->prepare(
            'INSERT INTO registros_sesiones (sala, categoria, mes, anio, sesiones)
             VALUES (:sala, :categoria, :mes, :anio, :sesiones)'
        );
        $stmt->execute([
            'sala' => $payload['room'],
            'categoria' => $payload['category'],
            'mes' => $payload['month'],
            'anio' => $payload['year'],
            'sesiones' => $payload['sessions'],
        ]);
    }

    $id = (int)$pdo->lastInsertId();
    $record = fetch_session_record($pdo, $id);
    respond(['ok' => true, 'record' => $record], 201);
}

if ($method === 'PUT') {
    $data = read_json_body();
    $type = detect_type($data);
    $id = filter_var($data['id'] ?? null, FILTER_VALIDATE_INT);
    if ($id === false || $id < 1) {
        respond(['ok' => false, 'error' => 'ID no valido'], 422);
    }

    if ($type === 'expense') {
        if (!has_table($pdo, 'gastos_registro')) {
            respond(['ok' => false, 'error' => 'Falta la tabla gastos_registro. Ejecuta la migracion SQL.'], 500);
        }

        $payload = validate_expense_payload($data);
        $stmt = $pdo->prepare(
            'UPDATE gastos_registro
             SET mes = :mes,
                 anio = :anio,
                 importe = :importe,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = :id'
        );
        $stmt->execute([
            'id' => $id,
            'mes' => $payload['month'],
            'anio' => $payload['year'],
            'importe' => $payload['amount'],
        ]);

        $record = fetch_expense_record($pdo, $id);
        if ($record === null) {
            respond(['ok' => false, 'error' => 'Gasto no encontrado'], 404);
        }
        respond(['ok' => true, 'record' => $record]);
    }

    if ($type === 'monthly_real') {
        if (!has_table($pdo, 'facturacion_real_mensual')) {
            respond(['ok' => false, 'error' => 'Falta la tabla facturacion_real_mensual. Ejecuta la migracion SQL.'], 500);
        }

        $payload = validate_monthly_real_payload($data);
        $stmt = $pdo->prepare(
            'UPDATE facturacion_real_mensual
             SET mes = :mes,
                 anio = :anio,
                 facturacion_real = :facturacion_real,
                 beneficio_real = :beneficio_real,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = :id'
        );
        $stmt->execute([
            'id' => $id,
            'mes' => $payload['month'],
            'anio' => $payload['year'],
            'facturacion_real' => $payload['billingReal'],
            'beneficio_real' => $payload['profitReal'],
        ]);

        $record = fetch_monthly_real_record($pdo, $id);
        if ($record === null) {
            respond(['ok' => false, 'error' => 'Registro de facturación real no encontrado'], 404);
        }
        respond(['ok' => true, 'record' => $record]);
    }

    $payload = validate_session_payload($data);
    $withModifiers = has_column($pdo, 'registros_sesiones', 'nocturna');

    if ($withModifiers) {
        $stmt = $pdo->prepare(
            'UPDATE registros_sesiones
             SET sala = :sala,
                 categoria = :categoria,
                 mes = :mes,
                 anio = :anio,
                 sesiones = :sesiones,
                 nocturna = :nocturna,
                 escape_up = :escape_up,
                 agencia = :agencia,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = :id'
        );
        $stmt->execute([
            'id' => $id,
            'sala' => $payload['room'],
            'categoria' => $payload['category'],
            'mes' => $payload['month'],
            'anio' => $payload['year'],
            'sesiones' => $payload['sessions'],
            'nocturna' => $payload['nightSession'] ? 1 : 0,
            'escape_up' => $payload['escapeUp'] ? 1 : 0,
            'agencia' => $payload['agency'] ? 1 : 0,
        ]);
    } else {
        $stmt = $pdo->prepare(
            'UPDATE registros_sesiones
             SET sala = :sala,
                 categoria = :categoria,
                 mes = :mes,
                 anio = :anio,
                 sesiones = :sesiones,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = :id'
        );
        $stmt->execute([
            'id' => $id,
            'sala' => $payload['room'],
            'categoria' => $payload['category'],
            'mes' => $payload['month'],
            'anio' => $payload['year'],
            'sesiones' => $payload['sessions'],
        ]);
    }

    $record = fetch_session_record($pdo, $id);
    if ($record === null) {
        respond(['ok' => false, 'error' => 'Registro no encontrado'], 404);
    }

    respond(['ok' => true, 'record' => $record]);
}

if ($method === 'DELETE') {
    $data = read_json_body();
    $type = detect_type($data);
    $id = filter_var($data['id'] ?? null, FILTER_VALIDATE_INT);
    if ($id === false || $id < 1) {
        respond(['ok' => false, 'error' => 'ID no valido'], 422);
    }

    if ($type === 'expense') {
        if (!has_table($pdo, 'gastos_registro')) {
            respond(['ok' => false, 'error' => 'Gasto no encontrado'], 404);
        }

        $stmt = $pdo->prepare('DELETE FROM gastos_registro WHERE id = :id');
        $stmt->execute(['id' => $id]);
        if ($stmt->rowCount() < 1) {
            respond(['ok' => false, 'error' => 'Gasto no encontrado'], 404);
        }

        respond(['ok' => true]);
    }

    if ($type === 'monthly_real') {
        if (!has_table($pdo, 'facturacion_real_mensual')) {
            respond(['ok' => false, 'error' => 'Registro de facturación real no encontrado'], 404);
        }

        $stmt = $pdo->prepare('DELETE FROM facturacion_real_mensual WHERE id = :id');
        $stmt->execute(['id' => $id]);
        if ($stmt->rowCount() < 1) {
            respond(['ok' => false, 'error' => 'Registro de facturación real no encontrado'], 404);
        }

        respond(['ok' => true]);
    }

    $stmt = $pdo->prepare('DELETE FROM registros_sesiones WHERE id = :id');
    $stmt->execute(['id' => $id]);

    if ($stmt->rowCount() < 1) {
        respond(['ok' => false, 'error' => 'Registro no encontrado'], 404);
    }

    respond(['ok' => true]);
}

respond(['ok' => false, 'error' => 'Metodo no permitido'], 405);
