<?php

declare(strict_types=1);

$config = require __DIR__ . '/config.php';

$required = ['db_host', 'db_name', 'db_user', 'db_pass', 'db_charset'];
foreach ($required as $key) {
    if (!array_key_exists($key, $config) || $config[$key] === '') {
        throw new RuntimeException("Configuracion incompleta en api/config.php ({$key})");
    }
}

$dsn = sprintf(
    'mysql:host=%s;dbname=%s;charset=%s',
    $config['db_host'],
    $config['db_name'],
    $config['db_charset']
);

$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

return new PDO($dsn, $config['db_user'], $config['db_pass'], $options);
