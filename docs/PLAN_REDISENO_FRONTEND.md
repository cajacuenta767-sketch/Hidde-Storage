# Plan de rediseño del frontend de DoraPass

**Estado:** plan aprobable, listo para implementarse por fases
**Fecha:** 2026-09-19
**Alcance:** tienda pública (`app/page.tsx` + `components/marketplace/`) y
piezas de soporte (nuevas tablas y CRUD admin para promociones).

## Objetivo

Convertir la portada en una vitrina comercial: anuncios de ofertas visibles,
carruseles temáticos tipo "streaming", tarjetas con descuento y urgencia, y
señales de confianza — sin sacrificar la velocidad ni la sencillez del flujo
de compra actual (máximo 2 clics del catálogo al checkout).

## Principios visuales

Se conserva la identidad definida en
`prompt-redisenio-portada-compacta-dorapass.md` (fondo blanco `#FFFFFF`, azul
corporativo `#155EEF`/`#1F63E9`, texto `#101828`/`#667085`, bordes
`#D0D5DD`/`#E4E7EC`, radios 12–16 px) con estas evoluciones puntuales:

- **Acentos por producto:** las tarjetas y banners pueden usar el
  `accent_color`/`accent_soft_color` que cada producto ya tiene en BD, como
  fondo suave del arte (nunca como bloques decorativos vacíos).
- **Un color de oferta:** introducir un único color cálido para descuentos y
  urgencia (ámbar `#F79009` para "quedan pocos", rojo suave `#D92D20` para
  precio tachado / "-35%"). Todo lo demás sigue frío y limpio.
- **Movimiento sutil:** transiciones de 150–250 ms con `ease-out`
  (elevación de tarjetas al pasar el cursor, aparición de secciones,
  auto-avance de banners). `tw-animate-css` ya está en las dependencias.
- **Tipografía:** cargar una sans moderna con `next/font` (recomendado:
  Inter o Geist) con jerarquía: display 44–56 px, títulos de sección
  22–26 px, cuerpo 14–15 px, metadatos 11–12 px.
- Nada de gradientes grandes, glows ni fondos oscuros; la "belleza" sale de
  ritmo vertical consistente (secciones cada 56–72 px), sombras apenas
  perceptibles y color usado con intención.

## Fase 0 — Fundamentos (base para todo lo demás)

1. Definir tokens CSS en `app/globals.css` (`--color-*`, `--radius-*`,
   `--shadow-*`, `--space-*`) y reemplazar los valores repetidos.
2. `next/font` con la tipografía elegida en `app/layout.tsx`.
3. Estados de interacción unificados: hover, focus visible, active y
   disabled para botones, tarjetas y chips.
4. Skeletons de carga para grilla y carruseles (evitan saltos de layout).

## Fase 1 — Anuncios de ofertas

### 1a. Barra de anuncios (announcement bar)

- Franja delgada (36–40 px) sobre el header, azul corporativo con texto
  blanco, mensajes rotativos cada 6 s con animación de deslizamiento:
  «🔥 Hasta 35% de descuento en streaming», «Entrega en minutos previa
  confirmación», «Paga con Yape, Plin o QR».
- Cerrable; recordar el cierre en `localStorage` por campaña (clave con id
  del anuncio, no genérica).

### 1b. Carrusel de banners de ofertas (hero comercial)

- Debajo del título principal (o sustituyendo el bloque actual), un carrusel
  de 3–5 banners a lo ancho del contenido, alto 160–220 px escritorio /
  120–150 px móvil.
- Cada banner: arte del producto sobre su `accent_soft_color`, texto de
  oferta («Netflix Premium — perfil desde S/ 9.90», «-35% pagando 3 meses»),
  CTA que abre directamente la hoja del producto (`openProduct`).
- **Usar `embla-carousel-react`** (ya instalado y sin uso): autoplay 5–6 s,
  pausa al pasar el cursor, loop, puntos de posición, flechas accesibles y
  arrastre táctil. Reemplazar también el carrusel manual de plataformas del
  hero por Embla para unificar comportamiento.

### 1c. Origen de datos: tabla `promotions`

Los banners y la barra se administran desde el panel (no hardcodear):

```
promotions (
  id, kind ('banner' | 'announcement'),
  title, subtitle, cta_label,
  product_id nullable → products,
  offer_variant_id nullable → offer_variants,
  market_code nullable ('PE' | 'BO' | null = ambos),
  sort_order, starts_at, ends_at, is_active,
  created_at, updated_at
)
```

- Migración `0016_promotions.sql` + rollback, siguiendo el patrón existente.
- CRUD en `/admin/promociones` (lista + formulario con vista previa) y
  entrada en la navegación del panel.
- Fallback automático: si no hay promociones activas, los banners se generan
  con las variantes de mayor `discount_basis_points` con stock.

## Fase 2 — Carruseles temáticos y catálogo

### 2a. Filas horizontales antes de la grilla

Entre el buscador y «Todos los servicios», 2–4 filas desplazables (Embla,
`slidesToScroll` según viewport):

| Fila | Fuente de datos (ya existe) |
| --- | --- |
| 🔥 Ofertas destacadas | variantes con mayor `discountPercent` y stock > 0 |
| ⭐ Los más pedidos | conteo de `purchase_order_items` de los últimos 30 días |
| 🆕 Nuevos en el catálogo | `products.created_at` recientes |
| 🔄 Volvieron con stock | variantes con `stock_requests` recién `fulfilled` |

- Cada fila: título + «Ver todo» (aplica el filtro correspondiente en la
  grilla) + tarjetas compactas (~180 px) con arte, nombre, precio «desde» y
  badge de descuento.
- En móvil las filas hacen scroll con snap (`scroll-snap-type: x mandatory`).

### 2b. Tarjetas de producto v2 (grilla)

- Badge de descuento visible («-35%») cuando `maxDiscountPercent > 0`,
  con el precio de comparación tachado junto al precio.
- Chips de estado con los datos reales: «Entrega rápida», «Quedan pocos»
  (stock 1–3, ámbar), «Sin stock — Avísame» (conecta con el flujo de
  solicitudes de stock ya implementado).
- Hover: elevación suave + zoom leve del arte (1.03) + CTA visible.
- Micro-animación del corazón de favoritos (escala + relleno).

### 2c. Sección «Favoritos» personalizada

Si el visitante tiene favoritos guardados, mostrar una fila «Tus favoritos»
arriba del catálogo (los datos ya están en `localStorage`).

## Fase 3 — Confianza y conversión

1. **Franja «Cómo funciona»** en 3 pasos con iconos (elige → paga por
   Yape/Plin/QR → recibe tu acceso), compacta, una sola vez en la página.
2. **Medios de pago visibles:** logos de Yape, Plin y QR junto al buscador o
   en el pie (los métodos ya están en la tabla `payment_methods`).
3. **Botón flotante de WhatsApp** (abajo a la derecha, 56 px) usando
   `DORAPASS_WHATSAPP_NUMBER`; ocultarlo cuando una hoja está abierta.
4. **Contador de urgencia honesto:** en la hoja del producto, «Solo quedan
   N» cuando el stock real es ≤ 5. Nunca inventar escasez.
5. **FAQ en acordeón** al pie (garantía, tiempos de entrega, renovación) —
   contenido ya disponible en `docs/CUSTOMER_PORTAL.md`.
6. Pie de página ordenado: enlaces legales existentes, categorías, contacto.

## Fase 4 — Hoja de producto (detalle) v2

1. Selector de duración como tarjetas comparativas: precio total, precio
   por mes, ahorro vs. 1 mes y badge «Mejor valor» en la mayor duración con
   descuento (datos ya presentes en `CatalogOffer`).
2. Encabezado con el arte y `accent_soft_color` del producto de fondo.
3. Bloque de garantía visible (`warrantyDays` ya viaja en la oferta).
4. Mantener intactos el flujo de compra por WhatsApp, el carrito y el botón
   «Avísame cuando haya stock».

## Fase 5 — Pulido y rendimiento

- Optimizar artes con `next/image` (tamaños fijos, `priority` solo primeras
  4 tarjetas, `loading="lazy"` para el resto) — patrón ya iniciado.
- Contraste AA en todos los pares de color nuevos; focos visibles;
  `prefers-reduced-motion` desactiva autoplay y animaciones.
- Objetivo Lighthouse móvil ≥ 90 en Performance y Accesibilidad.
- Revisión responsive en 360, 768, 1024 y 1440 px sin scroll horizontal.

## Orden recomendado y tamaño de cada fase

| Fase | Contenido | Esfuerzo relativo |
| --- | --- | --- |
| 0 | Tokens, tipografía, estados, skeletons | Pequeño |
| 1 | Barra de anuncios + banners de ofertas + tabla `promotions` + CRUD admin | Mediano-grande |
| 2 | Carruseles temáticos + tarjetas v2 | Mediano |
| 3 | Confianza: cómo funciona, pagos, WhatsApp, FAQ, footer | Pequeño-mediano |
| 4 | Hoja de producto v2 | Pequeño-mediano |
| 5 | Pulido, imágenes, accesibilidad, Lighthouse | Pequeño |

Cada fase se entrega funcional por separado (una rama/PR por fase), con
`npx tsc --noEmit`, `npm run lint`, `npm run test:subscriptions` y
`npm run build` en verde antes de subir.

## Fuera de alcance de este plan

- Pasarelas de pago (plan aparte, ver README «Pendientes»).
- Rediseño del panel admin y del portal `mi-cuenta` (solo se agrega
  `/admin/promociones`).
- Modo oscuro (evaluable después de la Fase 5).
