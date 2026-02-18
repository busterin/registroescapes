# registroescapes

App web para registrar sesiones de salas de escape.

## Despliegue en IONOS (PHP + MySQL)

1. Importa el SQL en phpMyAdmin:
   - Archivo: `database/schema.sql`
2. Configura conexión MySQL:
   - Edita `api/config.php` con tus credenciales reales (`db_host`, `db_name`, `db_user`, `db_pass`).
3. Configura acceso de administrador:
   - En `api/config.php`, rellena `auth_password_hash` con el SHA-256 de tu contraseña.
   - Para generar hash en local:
     - `printf '%s' 'TU_PASSWORD' | shasum -a 256`
4. Sube el proyecto al hosting.
5. Comprueba que responde la API:
   - `https://registroescapes.yurmuvi.com/api/session.php` (debe responder JSON)

## Migración (nuevos checks de registro)

Si ya tenías creada la tabla `registros_sesiones`, ejecuta este SQL una sola vez:

```sql
ALTER TABLE registros_sesiones
  ADD COLUMN nocturna TINYINT(1) NOT NULL DEFAULT 0 AFTER sesiones,
  ADD COLUMN escape_up TINYINT(1) NOT NULL DEFAULT 0 AFTER nocturna,
  ADD COLUMN agencia TINYINT(1) NOT NULL DEFAULT 0 AFTER escape_up;
```

Para habilitar el formulario de gastos, crea también esta tabla:

```sql
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
```

Y para habilitar `Facturación Mensual REAL`, crea esta tabla:

```sql
CREATE TABLE IF NOT EXISTS facturacion_real_mensual (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  mes TINYINT UNSIGNED NOT NULL,
  anio SMALLINT UNSIGNED NOT NULL,
  facturacion_real DECIMAL(10,2) NOT NULL,
  beneficio_real DECIMAL(10,2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_real_periodo (anio, mes),
  KEY idx_real_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## API disponible

- `POST /api/login.php` -> inicia sesión de acceso
- `GET /api/session.php` -> estado de sesión actual
- `GET /api/records.php` -> lista registros (requiere sesión)
- `POST /api/records.php` -> crea registro (requiere sesión)
- `PUT /api/records.php` -> actualiza registro (requiere sesión)
- `DELETE /api/records.php` -> elimina registro (requiere sesión)

Todos los cuerpos de `POST/PUT/DELETE` se envian en JSON.
