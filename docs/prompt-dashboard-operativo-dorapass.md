# Prompt de implementación — Dashboard operativo DoraPass

Mejora el dashboard principal del administrador de DoraPass y conviértelo en un centro de control operativo para un marketplace de suscripciones digitales que trabaja en Perú y Bolivia.

## Objetivo

El administrador debe poder responder en menos de un minuto:

- cuánto vendió y cobró en el período;
- cuánto costaron las cuentas proveedoras y cuál fue la ganancia bruta;
- qué perfiles están ocupados o libres;
- qué suscripciones pagadas siguen sin perfil asignado;
- qué cuentas proveedoras, renovaciones, pagos o incidencias requieren atención;
- qué cuentas son rentables y cuáles necesitan corrección.

No mostrar métricas inventadas ni números escritos directamente en los componentes. Todas las cifras, tendencias, alertas, estados y tablas deben proceder de PostgreSQL.

## Filtros globales

Agregar filtros por:

- período: últimos 30 días, mes actual y últimos 90 días;
- país: todos, Perú o Bolivia;
- moneda de reporte: soles peruanos o bolivianos.

Los filtros deben viajar en la URL para que una vista pueda recargarse o compartirse sin perder su estado. El país debe afectar ventas, ingresos, pagos y suscripciones; la ocupación de inventario sigue siendo global porque una cuenta puede atender ambos mercados. La moneda solo cambia la presentación de los importes y nunca altera los registros históricos.

## Datos financieros y trazabilidad

Crear registros históricos de pagos confirmados y costos de cuentas proveedoras. Cada registro debe conservar:

- monto y moneda original;
- monto normalizado a PEN;
- tipo de cambio utilizado;
- fecha;
- cliente, producto, suscripción y país cuando corresponda;
- cuenta proveedora asignada cuando exista;
- administrador que confirmó o registró la operación;
- origen: compra inicial, renovación o ajuste manual.

Usar las tasas oficiales ya almacenadas en `exchange_rates`. Para convertir:

- PEN a PEN: factor 1;
- USD a PEN: tasa oficial USD/PEN;
- BOB a PEN: inversa de la tasa oficial PEN/BOB;
- PEN a BOB para mostrar reportes: tasa oficial PEN/BOB.

No recalcular el monto normalizado de una operación histórica cuando cambie la tasa oficial. La tasa elegida debe quedar guardada con la operación.

## Definiciones y fórmulas

- Ventas confirmadas = cantidad de pagos con estado confirmado y fecha dentro del período.
- Ingresos cobrados = suma del monto normalizado de pagos confirmados del período.
- Costos registrados = suma del monto normalizado de eventos de costo del período.
- Ganancia bruta = ingresos cobrados − costos registrados.
- Margen bruto = ganancia bruta / ingresos cobrados × 100. Si los ingresos son cero, mostrar 0 %.
- Ocupación = perfiles asignados / perfiles totales activos × 100.
- Vencen en 7 días = suscripciones activas o por vencer cuya fecha final está entre hoy y hoy + 7 días.
- Pagadas sin perfil = suscripciones de tipo perfil, activas o por vencer, sin una asignación activa.

Comparar ventas, ingresos, costos y ganancia contra el período anterior de igual duración. No mostrar porcentajes cuando no exista una base anterior válida; usar “Sin período anterior”.

## Prioridad de alertas

Crear una cola unificada y ordenarla así:

1. Crítica: cuenta proveedora vencida o suspendida; incidencia crítica.
2. Alta: suscripción pagada sin perfil; incidencia alta; cuenta en mantenimiento con clientes activos.
3. Media: cuenta que renueva en 7 días; suscripción que vence en 7 días; pago pendiente de revisión.
4. Baja: advertencias informativas sin bloqueo inmediato.

Cada alerta debe mostrar tipo, plataforma o código interno, motivo, vencimiento o antigüedad y una acción directa. No mostrar correos, contraseñas, PIN ni datos personales en el resumen.

## Salud de cuenta proveedora

Calcular un estado derivado, no editable manualmente:

- Crítica: vencida, suspendida o con incidencia crítica abierta.
- Atención: mantenimiento, renovación próxima, incidencia abierta, ocupación total sin capacidad libre o margen negativo en el período.
- Saludable: activa, sin alertas y sin condiciones anteriores.
- Archivada: fuera de operación.

El color debe acompañarse siempre con texto e icono; no depender solo del color.

## Estructura visual

Mantener el diseño empresarial actual de DoraPass:

- barra superior azul sólido;
- menú lateral blanco;
- fondo blanco real;
- texto negro o gris oscuro;
- azul DoraPass como único color de marca;
- verde, ámbar, rojo y gris únicamente para estados;
- bordes suaves, radios de 8 a 10 px, sin gradientes ni efectos decorativos.

Orden de la página:

1. Encabezado con filtros y botón “Nueva cuenta”.
2. Tarjetas compactas: ventas confirmadas, ingresos cobrados, ganancia bruta, ocupación, vencen en 7 días e incidencias abiertas.
3. Gráfico “Ingresos y ganancia” y cola “Requiere atención”.
4. Ocupación por plataforma y rentabilidad por cuenta.
5. Acciones rápidas: asignar perfil, registrar pago, abrir incidencia y añadir cuenta.
6. Tabla “Cuentas que requieren control”.
7. Pagos pendientes y actividad reciente permanecen accesibles, pero debajo del control prioritario.

Los gráficos deben mostrar valores importantes sin exigir pasar el cursor. Usar una línea temporal para ingresos/ganancia y barras horizontales para ocupación. Las cifras monetarias y porcentajes de tablas deben alinearse a la derecha.

## Responsive

En móvil:

- ocultar el menú lateral en un panel desplegable;
- permitir que filtros se adapten sin provocar desplazamiento horizontal de la página;
- colocar “Requiere atención” antes del gráfico;
- transformar tablas anchas en filas apiladas legibles;
- mantener acciones táctiles de al menos 44 px;
- mostrar valores esenciales sin hover.

## Arquitectura y seguridad

- Mantener Next.js App Router, React Server Components, PostgreSQL y Drizzle.
- Ejecutar lecturas en una capa `server-only` y pasar al cliente únicamente series serializables necesarias para los gráficos.
- Ejecutar consultas independientes en paralelo.
- Validar autenticación de administrador cerca de cada lectura y mutación.
- Conservar cifrado, auditoría y revelado temporal de credenciales existentes.
- No exponer secretos ni identificadores sensibles en componentes cliente, logs o URL.
- Las acciones rápidas deben enlazar a flujos existentes y respetar permisos.

## Datos de demostración y validación

Agregar datos demo deterministas para pagos y costos, ligados a suscripciones, asignaciones y cuentas existentes. No usar arreglos de métricas dentro del componente.

Validar:

- migración y seed repetibles;
- fórmulas financieras con consultas directas a PostgreSQL;
- filtros por período, país y moneda;
- ausencia de pagos duplicados al confirmar una renovación;
- vínculo automático del pago con la cuenta cuando se asigna un perfil;
- tipado, lint, pruebas y compilación;
- escritorio y móvil sin desbordes;
- carga, consola e interacción principal en el navegador local.
