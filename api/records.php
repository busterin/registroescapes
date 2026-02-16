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

function validate_payload(array $data): array
{
    $room = trim((string)($data['room'] ?? ''));
    $category = trim((string)($data['category'] ?? ''));
    $month = filter_var($data['month'] ?? null, FILTER_VALIDATE_INT);
    $year = filter_var($data['year'] ?? null, FILTER_VALIDATE_INT);
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

    if ($month === false || $month < 1 || $month > 12) {
        respond(['ok' => false, 'error' => 'Mes no valido'], 422);
    }

    if ($year === false || $year < 2000 || $year > 2100) {
        respond(['ok' => false, 'error' => 'Año no valido'], 422);
    }

    if ($sessions === false || $sessions < 0) {
        respond(['ok' => false, 'error' => 'Sesiones no validas'], 422);
    }

    return [
        'room' => $room,
        'category' => $category,
        'month' => $month,
        'year' => $year,
        'sessions' => $sessions,
        'nightSession' => $nightSession,
        'escapeUp' => $escapeUp,
        'agency' => $agency,
    ];
}

function fetch_record(PDO $pdo, int $id): ?array
{
    $withModifiers = has_modifier_columns($pdo);
    $select = $withModifiers
        ? 'SELECT id, sala, categoria, mes, anio, sesiones, nocturna, escape_up, agencia, created_at, updated_at
           FROM registros_sesiones
           WHERE id = :id'
        : 'SELECT id, sala, categoria, mes, anio, sesiones, created_at, updated_at
           FROM registros_sesiones
           WHERE id = :id';

    $stmt = $pdo->prepare(
        $select
    );
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();

    return $row !== false ? $row : null;
}

function has_modifier_columns(PDO $pdo): bool
{
    static $checked = false;
    static $result = false;

    if ($checked) {
        return $result;
    }

    $checked = true;
    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM registros_sesiones LIKE 'nocturna'");
        $result = $stmt->fetch() !== false;
    } catch (Throwable $e) {
        $result = false;
    }

    return $result;
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
    $withModifiers = has_modifier_columns($pdo);
    $sql = $withModifiers
        ? 'SELECT id, sala, categoria, mes, anio, sesiones, nocturna, escape_up, agencia, created_at, updated_at
           FROM registros_sesiones
           ORDER BY created_at DESC, id DESC'
        : 'SELECT id, sala, categoria, mes, anio, sesiones, created_at, updated_at
           FROM registros_sesiones
           ORDER BY created_at DESC, id DESC';
    $stmt = $pdo->query($sql);

    respond([
        'ok' => true,
        'records' => $stmt->fetchAll(),
    ]);
}

if ($method === 'POST') {
    $payload = validate_payload(read_json_body());

    $withModifiers = has_modifier_columns($pdo);
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
    $record = fetch_record($pdo, $id);

    respond(['ok' => true, 'record' => $record], 201);
}

if ($method === 'PUT') {
    $data = read_json_body();
    $id = filter_var($data['id'] ?? null, FILTER_VALIDATE_INT);
    if ($id === false || $id < 1) {
        respond(['ok' => false, 'error' => 'ID no valido'], 422);
    }

    $payload = validate_payload($data);

    $withModifiers = has_modifier_columns($pdo);
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

    $record = fetch_record($pdo, $id);
    if ($record === null) {
        respond(['ok' => false, 'error' => 'Registro no encontrado'], 404);
    }

    respond(['ok' => true, 'record' => $record]);
}

if ($method === 'DELETE') {
    $data = read_json_body();
    $id = filter_var($data['id'] ?? null, FILTER_VALIDATE_INT);
    if ($id === false || $id < 1) {
        respond(['ok' => false, 'error' => 'ID no valido'], 422);
    }

    $stmt = $pdo->prepare('DELETE FROM registros_sesiones WHERE id = :id');
    $stmt->execute(['id' => $id]);

    if ($stmt->rowCount() < 1) {
        respond(['ok' => false, 'error' => 'Registro no encontrado'], 404);
    }

    respond(['ok' => true]);
}

respond(['ok' => false, 'error' => 'Metodo no permitido'], 405);
