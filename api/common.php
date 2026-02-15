<?php

declare(strict_types=1);

function respond(array $payload, int $statusCode = 200)
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        respond(['ok' => false, 'error' => 'JSON invalido'], 400);
    }

    return $decoded;
}

function app_config(): array
{
    static $config = null;
    if ($config === null) {
        $config = require __DIR__ . '/config.php';
    }
    return $config;
}

function start_app_session(bool $remember = false): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    $config = app_config();
    $sessionName = (string)($config['session_name'] ?? 'regesc_sid');
    $lifetime = $remember ? 60 * 60 * 24 * 30 : 0;
    $isHttps = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';

    ini_set('session.gc_maxlifetime', (string)(60 * 60 * 24 * 30));
    ini_set('session.cookie_httponly', '1');
    ini_set('session.cookie_secure', $isHttps ? '1' : '0');

    session_name($sessionName);
    if (PHP_VERSION_ID >= 70300) {
        session_set_cookie_params([
            'lifetime' => $lifetime,
            'path' => '/',
            'secure' => $isHttps,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    } else {
        // Compatibilidad con PHP < 7.3 (sin array options ni SameSite nativo)
        session_set_cookie_params($lifetime, '/');
    }

    session_start();
}

function require_auth(): void
{
    start_app_session();
    if (($_SESSION['auth_ok'] ?? false) !== true) {
        respond(['ok' => false, 'error' => 'No autorizado'], 401);
    }
}
