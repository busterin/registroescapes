<?php

declare(strict_types=1);

require __DIR__ . '/common.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    respond(['ok' => false, 'error' => 'Metodo no permitido'], 405);
}

$data = read_json_body();
$password = (string)($data['password'] ?? '');
$remember = (bool)($data['remember'] ?? false);

$config = app_config();
$expectedHash = (string)($config['auth_password_hash'] ?? '');

if ($expectedHash === '') {
    respond(['ok' => false, 'error' => 'Config auth_password_hash no definida'], 500);
}

$providedHash = hash('sha256', $password);
if (!hash_equals($expectedHash, $providedHash)) {
    respond(['ok' => false, 'error' => 'Credenciales invalidas'], 401);
}

start_app_session($remember);
$_SESSION['auth_ok'] = true;
$_SESSION['auth_at'] = time();

respond(['ok' => true]);
