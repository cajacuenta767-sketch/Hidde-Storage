# Prompt de implementación — portada compacta de DoraPass

Rediseñar la portada pública de DoraPass para reducir drásticamente la altura vertical, mejorar la jerarquía visual y conservar todas las funciones de compra en computadora, tableta y móvil.

## Objetivo

La página debe llevar al usuario desde la propuesta principal hasta el catálogo con la menor fricción posible. El primer producto debe comenzar dentro del primer viewport o inmediatamente al final de este. No debe existir contenido promocional repetido entre el hero y el catálogo.

## Identidad visual obligatoria

- Fondo blanco real `#FFFFFF`.
- Azul corporativo principal cercano a `#155EEF` / `#1F63E9`.
- Texto principal negro azulado `#101828`.
- Texto secundario gris `#667085`.
- Bordes fríos y sutiles `#D0D5DD` / `#E4E7EC`.
- Sin gradientes, glows, fondos crema ni grandes superficies azules decorativas.
- Tipografía sans serif moderna, jerarquía clara y controles con tamaños deliberados.
- Radios de 12 a 16 px y sombras apenas perceptibles.

## Barra superior

- Altura aproximada: 64 px.
- Logo DoraPass a la izquierda.
- Navegación esencial: `Explorar` y el acceso correspondiente a `Panel administrador` o `Mis suscripciones`.
- Quitar `Vender` y su formulario porque DoraPass es el vendedor directo.
- Mantener carrito y acceso del usuario.
- En móvil: logo compacto, menú, carrito y avatar con objetivos táctiles de 44 px.

## Hero compacto

- Copia exacta: `Todas tus plataformas, en un solo lugar.`
- Sin kicker, badge o texto adicional encima del título.
- Escritorio: 44–56 px, máximo dos líneas.
- Móvil: 28–34 px, máximo tres líneas.
- Debajo, un carrusel horizontal con un máximo de 12 plataformas internacionales prioritarias; mostrar varias a la vez sin logos gigantes.
- Controles anterior/siguiente circulares, accesibles y discretos.
- Integrar en una sola fila de confianza:
  - `Compra rápida y segura`.
  - `Garantía durante todos los días del plan contratado` en escritorio.
  - Versiones compactas `Compra segura` y `Garantía todo el plan` en móvil.
- Presupuesto de altura: 230–280 px en escritorio y 190–245 px en móvil.

## Buscador y filtros

- Colocar inmediatamente después del hero.
- Escritorio: una barra horizontal de 64–72 px.
- Campo de búsqueda con texto exacto `Buscar una plataforma o plan`.
- Mostrar directamente solo las categorías principales que quepan.
- Añadir control `Más filtros` para abrir todas las categorías.
- En móvil: búsqueda en una fila y debajo `Todo`, `Categorías` y selector `Perú / Bolivia`.
- No permitir categorías cortadas ni desbordamiento horizontal de la página.
- Mantener estados seleccionados y atributos accesibles.

## Contenido que debe eliminarse

- El bloque azul `Catálogo completo / Servicios individuales en un solo lugar / 38 servicios`.
- La opción pública `Vender` y su panel.
- La franja de confianza repetida al final de la página.
- La etiqueta decorativa `Catálogo curado`.
- En cada tarjeta: nombre del vendedor, texto de entrega, descripción larga y badge de descuento repetitivo.

## Catálogo compacto

- Encabezado: `Todos los servicios`.
- Estado dinámico: cantidad de resultados y país actual.
- Mostrar inicialmente 8 productos y añadir un botón `Ver más servicios` que cargue otros 8.
- Mantener búsqueda, categoría, plataforma del carrusel y país como filtros reales.
- Reiniciar el bloque visible cuando cambie un filtro.

### Tarjeta en escritorio

- Cuatro columnas en pantallas amplias.
- Altura aproximada: 270–310 px.
- Imagen de plataforma completa, con sus colores reales, de 112–130 px de alto.
- Conservar la marca de agua de DoraPass sobre la imagen.
- Mostrar solo: verificado, plataforma, plan, precio inicial y botón `Configurar`.

### Tarjeta en móvil

- Fila horizontal de 145–170 px.
- Imagen cuadrada de 96–112 px a la izquierda.
- A la derecha: plataforma, plan, verificado, precio y acción `Configurar`.
- Ocultar contenido secundario y evitar apilar grandes imágenes verticales.

## Interacciones obligatorias

- Carrusel navegable.
- Buscador funcional.
- Categorías seleccionables desde la portada y desde un panel móvil/compacto.
- Selector Perú/Bolivia funcional.
- `Configurar` abre el panel existente de producto.
- Favoritos, carrito y compra por WhatsApp continúan funcionando.
- `Ver más servicios` amplía el catálogo sin recargar la página.
- Respetar `prefers-reduced-motion`.

## Rendimiento y mantenimiento

- Conservar `next/image` para logos y artes de producto.
- Renderizar solamente los productos visibles en cada bloque.
- No añadir dependencias nuevas.
- Reutilizar los componentes, datos y paneles existentes.
- Mantener el límite cliente/servidor actual y no mover datos sensibles al cliente.

## Validación de aceptación

- Escritorio 1440×900: primera fila de productos visible en el primer viewport.
- Tableta 768×1024: sin recortes ni controles amontonados.
- Móvil 390×844: primer producto completo o mayormente visible dentro del primer viewport.
- Sin desplazamiento horizontal.
- Sin errores de consola ni overlay del framework.
- El filtro `Música y audio` debe cambiar el resultado y mostrar cinco productos en Bolivia con los datos actuales.
- La altura de las tarjetas móviles debe reducirse desde aproximadamente 414 px a un máximo de 170 px.
- La portada móvil inicial debe reducirse de aproximadamente 18 248 px a una fracción de esa altura mediante tarjetas compactas y carga progresiva.

