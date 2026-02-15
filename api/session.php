<?php

declare(strict_types=1);

require __DIR__ . '/common.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    respond(['ok' => false, 'error' => 'Metodo no permitido'], 405);
}

start_app_session();

respond([
    'ok' => true,
    'authenticated' => (($_SESSION['auth_ok'] ?? false) === true),
]);
