# registroescapes

App web para registrar sesiones de salas de escape.

## Despliegue en IONOS (PHP + MySQL)

1. Importa el SQL en phpMyAdmin:
   - Archivo: `database/schema.sql`
2. Configura conexión MySQL:
   - Edita `api/config.php` con tus credenciales reales.
3. Sube el proyecto al hosting.
4. Comprueba que responde la API:
   - `https://registroescapes.yurmuvi.com/api/records.php`

## API disponible

- `GET /api/records.php` -> lista registros
- `POST /api/records.php` -> crea registro
- `PUT /api/records.php` -> actualiza registro
- `DELETE /api/records.php` -> elimina registro

Todos los cuerpos de `POST/PUT/DELETE` se envian en JSON.
