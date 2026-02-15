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

## API disponible

- `POST /api/login.php` -> inicia sesión de acceso
- `GET /api/session.php` -> estado de sesión actual
- `GET /api/records.php` -> lista registros (requiere sesión)
- `POST /api/records.php` -> crea registro (requiere sesión)
- `PUT /api/records.php` -> actualiza registro (requiere sesión)
- `DELETE /api/records.php` -> elimina registro (requiere sesión)

Todos los cuerpos de `POST/PUT/DELETE` se envian en JSON.
