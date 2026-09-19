# Base de datos local

La base de DoraPass usa PostgreSQL 15 en Docker y escucha solo en `127.0.0.1:55433` para no interferir con otros proyectos del equipo.

## Puesta en marcha

```powershell
docker compose up -d postgres
npm run db:migrate
npm run db:seed
```

Los dos scripts usan `psql` dentro del contenedor para no depender del reenvio de puertos de Docker Desktop durante tareas administrativas.

La semilla es repetible. Crea dos mercados, cuatro categorias, seis productos ficticios y precios independientes en PEN y BOB. No crea inventario ni credenciales digitales.

## Cambiar el esquema

1. Editar `db/schema/index.ts`.
2. Ejecutar `npm run db:generate`.
3. Revisar el SQL generado en `db/migrations`.
4. Ejecutar `npm run db:migrate`.

## Comprobar el servicio

```powershell
docker compose ps
docker compose exec postgres pg_isready -U luma_pass -d luma_pass
```

## Detenerlo

```powershell
docker compose stop postgres
```

No usar `docker compose down -v` en un entorno con datos importantes porque elimina el volumen de la base.

## Docker Desktop en Windows

El error WSL `0xc00000fd` observado el 30 de agosto de 2026 fue causado por falta de espacio en `C:`: quedaban aproximadamente 278 MB y Windows habia reducido el archivo de paginacion a unos 563 MB. Se resolvio limpiando temporales regenerables y la cache de npm, terminando la instancia atascada de Docker y arrancandola de nuevo.

Para evitar que reaparezca:

- Mantener idealmente 10 GB o mas libres en `C:`.
- Mantener WSL actualizado con `wsl --update`.
- No eliminar manualmente el disco, las imagenes o los volumenes de Docker.
- Si Docker queda en `stopping`, comprobar primero el espacio libre antes de reiniciar WSL.
