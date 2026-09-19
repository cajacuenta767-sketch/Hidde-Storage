# Modelo de negocio de DoraPass

**Estado:** hipotesis comercial para validacion  
**Version:** 0.1  
**Fecha:** 2026-08-30  
**Mercado inicial recomendado:** Peru

## 1. Tesis

DoraPass conecta a titulares de planes digitales que tienen un cupo oficial sin usar con personas que quieren pagar por ese cupo en moneda local.

La plataforma no vende ni comparte contrasenas. El titular mantiene su cuenta principal y el comprador recibe una invitacion oficial, una cuenta separada o el mecanismo permitido por el proveedor. DoraPass administra el descubrimiento, cobro, renovacion, soporte, reputacion y resolucion de disputas.

La unidad comercial no se llamara "perfil compartido" dentro del producto. Se llamara **cupo**, **miembro extra** o **acceso invitado**, segun la terminologia oficial de cada servicio.

## 2. Restriccion central

Que un plan muestre varios perfiles no significa que esos perfiles puedan venderse a desconocidos. Cada plataforma establece condiciones diferentes.

DoraPass solo admitira una plataforma cuando se cumplan todos estos criterios:

1. La plataforma permite expresamente invitar a una persona fuera del hogar, o existe un acuerdo comercial de distribucion.
2. El invitado recibe acceso independiente sin conocer la contrasena principal.
3. La funcion esta disponible en el pais del titular y del invitado.
4. El titular puede retirar o sustituir al invitado mediante el flujo oficial.
5. DoraPass puede explicar el servicio sin inducir al usuario a declarar una direccion falsa o evadir controles de hogar.

El catalogo solo incluira planes individuales y codigos oficiales. No se ofreceran cuentas completas, cookies, codigos de verificacion, perfiles con PIN ni credenciales compartidas.

## 3. Segmentos

### Comprador

- Persona sin tarjeta internacional o que prefiere Yape, Plin, QR o transferencia local.
- Usuario que solo necesita un acceso y no quiere pagar un plan completo.
- Cliente que valora soporte local, precio claro y proteccion ante cancelaciones.

### Titular

- Persona que ya paga un plan elegible y puede habilitar un miembro extra oficial.
- Quiere recuperar parte del costo mensual sin compartir su contrasena.
- Acepta mantener el cupo durante el ciclo contratado y responder a incidencias.

## 4. Propuesta de valor

### Para el comprador

- Pago en moneda y medios locales.
- Cuenta o invitacion individual, sin contrasenas ajenas.
- Precio menor que contratar el plan completo cuando la estructura oficial lo permita.
- Reemplazo o devolucion definidos si el titular retira el acceso antes de tiempo.
- Soporte humano por WhatsApp.

### Para el titular

- Monetiza un cupo elegible que no utiliza.
- DoraPass cobra, recuerda renovaciones y filtra compradores.
- No entrega su contrasena ni datos de pago.
- Historial, reputacion y reglas de cancelacion.

## 5. Producto inicial

El MVP se limitara a una sola plataforma y un solo pais. La primera candidata es un servicio que ofrezca oficialmente miembros extra fuera del hogar y permita cuentas separadas.

Flujo:

1. El titular elige la plataforma y declara el tipo de plan.
2. DoraPass comprueba que el plan admite un miembro extra en ese pais.
3. El titular publica el cupo, su precio y fecha de renovacion.
4. El comprador paga a DoraPass.
5. El titular envia la invitacion oficial al correo o telefono del comprador.
6. El comprador confirma que activo su cuenta independiente.
7. DoraPass libera el pago al titular, reteniendo comision y una reserva de proteccion.
8. Antes de la renovacion, ambas partes reciben recordatorios y pueden continuar o cancelar.

Para la validacion inicial, la liberacion al titular puede ser manual y auditada. La automatizacion de pagos a vendedores se pospone hasta confirmar los requisitos legales, tributarios y de la pasarela.

## 6. Ingresos

Modelo inicial:

- Comision de intermediacion sobre cada ciclo pagado.
- Tarifa de proteccion incluida en el precio del comprador.
- Cargo opcional por reemplazo prioritario o soporte premium.

Hipotesis para pruebas, no precios definitivos:

- Comision total objetivo: 15% a 22% del pago.
- Reserva temporal: 5% a 10% del pago del titular, liberada cuando termina el periodo protegido.
- Margen minimo por operacion: debe cubrir pasarela, fraude, soporte, devoluciones e impuestos.

Formula:

```text
contribucion por cupo =
ingreso cobrado al comprador
- pago al titular
- comision de pasarela
- provision de devoluciones
- costo de soporte
- impuestos atribuibles
```

No se escalara una plataforma si la contribucion esperada es negativa o si la tasa de incidencias supera el margen.

## 7. Confianza y riesgo

### Controles del titular

- Identidad y telefono verificados.
- Comprobante del tipo de plan, ocultando datos sensibles.
- Coincidencia de pais entre plan, cobro e invitado.
- Retencion inicial y limite de cupos para cuentas nuevas.
- Penalizacion y suspension por retirar accesos antes del vencimiento.

### Controles del comprador

- Correo y telefono verificados.
- Confirmacion de activacion.
- Prohibicion de revender el acceso.
- Historial de disputas y contracargos.

### Proteccion de datos

- Nunca solicitar la contrasena de una plataforma.
- Nunca almacenar cookies, codigos de autenticacion ni datos de tarjeta.
- Guardar solo identificadores, evidencia minima, estado de la invitacion y trazabilidad.
- Eliminar o redactar capturas despues del periodo de disputa.

## 8. Politica por plataforma

Cada plataforma tendra un registro versionado con:

- Paises admitidos.
- Planes elegibles.
- Numero de cupos.
- Si admite personas fuera del hogar.
- Tipo de invitacion.
- Restricciones de cambio.
- Fuente oficial y fecha de ultima revision.
- Estado: habilitada, pausada o prohibida.

Una modificacion de condiciones puede pausar nuevas publicaciones sin borrar contratos activos. Operaciones revisara las fuentes oficiales mensualmente.

## 9. Metricas del piloto

- Titulares verificados.
- Cupos publicados y porcentaje ocupado.
- Tiempo medio hasta encontrar comprador.
- Conversion de visita a pago.
- Activaciones completadas en menos de 30 minutos.
- Renovacion al segundo mes.
- Cancelaciones anticipadas.
- Disputas y devoluciones por cada 100 pagos.
- Margen de contribucion por cupo.
- Tickets de soporte por ciclo.

## 10. Validacion antes de automatizar

1. Entrevistar a 15 titulares y 15 compradores potenciales.
2. Conseguir 10 cupos elegibles de una sola plataforma.
3. Completar al menos 20 ciclos pagados de forma asistida.
4. Confirmar con asesor legal y pasarela si DoraPass actua como marketplace, agente de cobro o revendedor.
5. Validar facturacion, impuestos, devoluciones y pagos al titular en el pais inicial.
6. Automatizar solo despues de conocer la tasa real de renovacion, fraude y soporte.

## 11. Cambios requeridos en el producto

El esquema actual de catalogo e inventario de codigos no representa completamente este modelo. Se necesitaran, como minimo:

- `platforms`: reglas y elegibilidad versionadas.
- `plan_types`: planes y cupos permitidos por pais.
- `listings`: publicaciones de titulares.
- `listing_slots`: cupos disponibles y ocupados.
- `memberships`: relacion entre titular, comprador y ciclo.
- `invitations`: estado de invitacion sin almacenar credenciales.
- `billing_cycles`: cobro, renovacion, vencimiento y prorrateo.
- `payouts`: pago al titular y retenciones.
- `disputes`: incidencias, evidencia y resolucion.
- `policy_sources`: fuente oficial y fecha de revision.

El primer flujo tecnico sera: **publicar cupo -> reservar -> cobrar -> invitar -> confirmar activacion -> liberar pago -> renovar o cerrar**.

## 12. Decision ejecutiva

DoraPass puede conservar la idea de compartir el costo de streaming, pero no debe construirse alrededor del intercambio de perfiles y contrasenas. La oportunidad defendible es ser la capa de confianza y pagos locales para cupos oficiales, empezando con una sola plataforma compatible y bloqueando automaticamente las que exijan convivencia.
