# Conectar DoraPass con Telegram

El bot es privado y sirve únicamente para el administrador. Permite consultar
un pedido y generar su token de entrega después de confirmar el pago. No recibe
pagos y nunca muestra el correo, la contraseña o el PIN de una cuenta.

## Flujo final

1. El cliente compra en DoraPass y escribe por WhatsApp.
2. El administrador comprueba el pago y lo confirma en el panel web.
3. Telegram avisa automáticamente al administrador con el resumen del pedido.
4. El administrador pulsa **Confirmar pago recibido** dentro de Telegram.
5. DoraPass confirma el pago, asigna el acceso y genera el token.
6. Telegram recibe automáticamente el token y un mensaje listo para copiar.
7. El administrador pega ese mensaje al cliente por WhatsApp.
8. El cliente ingresa el token en DoraPass y allí ve sus credenciales.

El panel web conserva el botón **Generar nuevo token** y los comandos `/pedido`
y `/token` como respaldo si la entrega automática falla.

## 1. Crear el bot

1. Abre Telegram y entra únicamente al bot oficial `@BotFather`.
2. Envía `/newbot`.
3. Nombre recomendado: `DoraPass Administrador`.
4. Elige un usuario disponible que termine en `bot`, por ejemplo
   `DoraPassControlBot`.
5. BotFather entregará `TELEGRAM_BOT_TOKEN`. Trátalo como una contraseña.
6. Abre el bot recién creado, pulsa **Iniciar** y envía `/start`.

No pegues el token en chats, documentos públicos ni código fuente.

## 2. Configuración inicial local

Abre `.env.local` y añade:

```env
TELEGRAM_BOT_TOKEN=TOKEN_ENTREGADO_POR_BOTFATHER
TELEGRAM_WEBHOOK_SECRET=UN_SECRETO_LARGO_ALEATORIO
TELEGRAM_ADMIN_CHAT_IDS=
TELEGRAM_ADMIN_EMAIL=admin@dorapass.local
NEXT_PUBLIC_APP_URL=https://tu-dominio-publico.com
```

El secreto del webhook debe tener entre 16 y 256 caracteres y usar solamente
letras, números, guion o guion bajo. Debe ser diferente al token del bot.

## 3. Obtener el identificador privado del administrador

Antes de registrar el webhook:

1. Abre tu bot, pulsa **Iniciar** y envía `/start`.
2. En la terminal del proyecto ejecuta:

```text
npm run telegram:chat-id
```

El comando mostrará tu identificador numérico. Colócalo en `.env.local`:

```env
TELEGRAM_ADMIN_CHAT_IDS=123456789
```

Para autorizar a dos administradores, usa comas:

```env
TELEGRAM_ADMIN_CHAT_IDS=123456789,987654321
```

Los mensajes provenientes de cualquier otro chat se ignoran.

## 4. Publicar DoraPass con HTTPS

Telegram no puede conectarse a `127.0.0.1`, `localhost` ni directamente al
puerto `3001`. Primero debes publicar DoraPass en una URL HTTPS, por ejemplo:

```text
https://dorapass.com
```

Configura esa dirección, sin una barra final:

```env
NEXT_PUBLIC_APP_URL=https://dorapass.com
```

La aplicación debe estar publicada con las mismas variables secretas del
archivo local. La dirección que recibirá Telegram será:

```text
https://dorapass.com/api/integrations/telegram/webhook
```

## 5. Registrar el webhook automáticamente

Con DoraPass ya publicado y las variables completas, ejecuta:

```text
npm run telegram:register
```

Este comando valida el bot, configura `/pedido` y `/token`, registra el webhook
con su secreto y limita las actualizaciones recibidas a mensajes.

Después comprueba el estado con:

```text
npm run telegram:status
```

Debe mostrar el usuario del bot, la URL del webhook y cero errores pendientes.

## 6. Probar el flujo

1. Confirma el pago desde **Administrador → Pedidos → Ver pedido**.
2. En Telegram consulta:

```text
/pedido DP-20260901-ABCDEF12
```

3. Si el estado indica pago confirmado, genera el token:

```text
/token DP-20260901-ABCDEF12
```

4. Copia el token recibido y envíalo al cliente por WhatsApp.
5. El cliente abre su pedido y coloca el token en el paso 3.

El token dura 30 minutos, permite hasta cinco intentos y queda inutilizado
después de usarse. Generar uno nuevo revoca el anterior.

## Diagnóstico

Si `telegram:chat-id` no encuentra mensajes, envía `/start` al bot y repite.
Telegram no permite `getUpdates` mientras hay un webhook activo. Para retirarlo
temporalmente ejecuta:

```text
npm run telegram:remove
```

Después obtén el chat ID y vuelve a registrar el webhook. Si el webhook muestra
un error, comprueba que la URL sea pública, use HTTPS, no redirija y tenga las
mismas variables configuradas en el servidor publicado.
