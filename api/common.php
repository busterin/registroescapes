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

function app_is_https(): bool
{
    return !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
}

function app_remember_cookie_name(): string
{
    $config = app_config();
    $sessionName = (string)($config['session_name'] ?? 'regesc_sid');
    return $sessionName . '_remember';
}

function has_remember_cookie(): bool
{
    $cookieName = app_remember_cookie_name();
    return ($_COOKIE[$cookieName] ?? '') === '1';
}

function set_remember_cookie(bool $remember): void
{
    $cookieName = app_remember_cookie_name();
    $isHttps = app_is_https();
    $expire = $remember ? (time() + (60 * 60 * 24 * 30)) : (time() - 3600);

    if (PHP_VERSION_ID >= 70300) {
        setcookie($cookieName, $remember ? '1' : '', [
            'expires' => $expire,
            'path' => '/',
            'secure' => $isHttps,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    } else {
        setcookie($cookieName, $remember ? '1' : '', $expire, '/');
    }
}

function start_app_session(bool $remember = false): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    $config = app_config();
    $sessionName = (string)($config['session_name'] ?? 'regesc_sid');
    $keepRemember = $remember || has_remember_cookie();
    $lifetime = $keepRemember ? 60 * 60 * 24 * 30 : 0;
    $isHttps = app_is_https();

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
