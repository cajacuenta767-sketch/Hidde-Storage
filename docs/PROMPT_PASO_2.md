# Prompt del paso 2: base de datos propia

Implementa la base de datos inicial de DoraPass sin Supabase ni otros servicios BaaS. Usa PostgreSQL local con Docker Compose, Drizzle ORM y migraciones SQL versionadas.

El alcance incluye mercados, categorias, productos, precios independientes para Peru y Bolivia e inventario digital cifrable. Usa importes enteros en centimos, nombres PostgreSQL en `snake_case`, claves primarias secuenciales, restricciones de integridad e indices para cada clave foranea y consulta frecuente.

Crea variables de entorno de ejemplo sin secretos reales, un cliente de conexion reutilizable, scripts para generar y ejecutar migraciones y una semilla idempotente con mercados `PE/PEN` y `BO/BOB`. No guardes cuentas ni contrasenas de streaming y no agregues credenciales reales de pago.

Levanta PostgreSQL, ejecuta la migracion y la semilla, comprueba los datos y valida la compilacion de Next.js. Documenta las decisiones y deja instrucciones breves para repetir el proceso.

Fuera de alcance: autenticacion, pedidos, carrito persistente, webhooks y pasarelas de pago.
