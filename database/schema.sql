CREATE TABLE IF NOT EXISTS registros_sesiones (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sala ENUM('Frankie','Magia','Filosofal','El regreso del vampiro') NOT NULL,
  categoria ENUM('2a5p','6p','7p','2a6(Filo)','7 a 12(Filo)','Guiado','Merienda') NOT NULL,
  mes TINYINT UNSIGNED NOT NULL,
  anio SMALLINT UNSIGNED NOT NULL,
  sesiones INT UNSIGNED NOT NULL,
  nocturna TINYINT(1) NOT NULL DEFAULT 0,
  escape_up TINYINT(1) NOT NULL DEFAULT 0,
  agencia TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_periodo (anio, mes),
  KEY idx_sala_periodo (sala, anio, mes),
  KEY idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gastos_registro (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  mes TINYINT UNSIGNED NOT NULL,
  anio SMALLINT UNSIGNED NOT NULL,
  importe DECIMAL(10,2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_gastos_periodo (anio, mes),
  KEY idx_gastos_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS usuarios_admin (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(60) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
