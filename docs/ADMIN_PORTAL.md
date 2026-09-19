# Panel administrativo de DoraPass

## Acceso local

- URL: `http://127.0.0.1:3001/admin`
- Correo de demostración: `admin@dorapass.local`
- Contraseña de demostración: `AdminDoraPass2026!`

Estas credenciales pertenecen únicamente a los datos locales creados por `npm run db:seed`. Deben reemplazarse antes de publicar el sitio.

## Funciones disponibles

- Resumen de pagos pendientes, suscripciones y clientes.
- Búsqueda y filtrado de solicitudes de renovación.
- Detalle de cada pedido con cliente, importe, país, fechas y duración.
- Confirmación manual de pagos verificados.
- Actualización automática de vencimiento y garantía al aprobar una renovación.
- Aviso automático al cliente cuando su renovación fue aprobada.
- Historial de eventos de la suscripción y auditoría administrativa.
- Consulta de suscripciones, clientes y métodos de pago activos.

## Flujo de confirmación manual

1. El cliente solicita una renovación desde su cuenta.
2. La solicitud aparece como `Pendiente de pago` en el panel.
3. El administrador comprueba el pago fuera del sistema mediante el método indicado.
4. El administrador abre el pedido y pulsa `Confirmar pago`.
5. DoraPass amplía el vencimiento desde la fecha válida más reciente, actualiza la garantía, registra la acción y notifica al cliente.

La operación está protegida para que una solicitud ya aprobada no vuelva a extender la suscripción.

## Siguiente integración pendiente

El panel trabaja actualmente con confirmación manual. La conexión real con una pasarela o con webhooks de pago debe añadirse después de definir el proveedor y obtener credenciales comerciales para Perú y Bolivia. Nunca deben almacenarse contraseñas de plataformas de streaming dentro de este panel.
