# Investigación de precios — septiembre 2026

**Fecha de investigación:** 2026-09-19
**Regla de precios aplicada:** nuestro precio = precio típico al que los
revendedores venden el perfil/cuenta por internet **+10%**. El precio oficial
del plan se usa solo como **precio de comparación** (tachado); cuando nuestro
precio es igual o mayor que el oficial, no se muestra comparación.
**Aplicado en:** `db/pricing-catalog.sql` (los montos finales por duración y
mercado se derivan de la tarifa base con las reglas de duración y los tipos de
cambio del mismo archivo).

## Advertencias generales

- La investigación se hizo por búsqueda web; varios sitios (tiendas de
  revendedores y páginas oficiales) no eran accesibles directamente, así que
  parte de los montos proviene de extractos indexados por buscadores.
  Verificar antes de tomar decisiones definitivas los marcados "estimado".
- Los precios de reventa son de mercado gris y cambian mes a mes.
- El precio oficial de comparación es el de Perú (o el global en USD); para
  Bolivia se convierte con el tipo de cambio oficial, no es la tarifa local
  boliviana real.

## Video y TV (PEN)

| Producto | Reventa típica | Nuestro precio (+10%) | Oficial (comparación) | Confianza |
| --- | --- | --- | --- | --- |
| Netflix perfil (sin VPN) | S/ 10.00 | S/ 11.00 | S/ 40.90 (Estándar) | Alta (Hot Perú, Gudfy, MercadoLibre) |
| Netflix perfil (con VPN) | S/ 5.00 | S/ 5.50 | S/ 40.90 | Media (piso del mercado P2P) |
| Disney+ | S/ 11.00 | S/ 12.10 | S/ 49.90 | Alta |
| Max | S/ 10.00 | S/ 11.00 | S/ 40.90 (dato oficial en conflicto: Selectra aún lista S/ 31.90) | Alta |
| Prime Video | S/ 9.00 | S/ 9.90 | S/ 25.90 | Alta |
| Apple TV+ | S/ 15.00 | S/ 16.50 | S/ 24.90 | Media |
| Paramount+ | S/ 10.00 | S/ 11.00 | S/ 18.90 (Esencial) | Alta |
| Crunchyroll Fan | S/ 6.00 | S/ 6.60 | S/ 19.90 | Media |
| Crunchyroll Mega Fan | S/ 8.00 | S/ 8.80 | S/ 23.90 | Media |
| ViX Premium | S/ 11.00 | S/ 12.10 | S/ 22.90 | Alta |
| Hulu (cuenta USA) | S/ 15.00 | S/ 16.50 | US$ 11.99 ≈ S/ 40.20 | Media |
| Claro video | sin datos de reventa | S/ 11.00 (base anterior +10%) | S/ 9.90 → sin comparación (oficial más barato) | Estimado |
| DGO / DIRECTV | sin datos de reventa | S/ 11.00 (base anterior +10%) | ~S/ 54 (referencial) | Estimado |
| Movistar TV App | sin datos de reventa | S/ 11.00 (base anterior +10%) | S/ 70.00 | Estimado |

## Música (PEN)

| Producto | Reventa típica | Nuestro precio | Oficial | Confianza |
| --- | --- | --- | --- | --- |
| Spotify Premium | S/ 10.00 | S/ 11.00 | S/ 20.90 | Alta |
| Apple Music | S/ 15.00 | S/ 16.50 | S/ 16.90 | Media (mercado casi inexistente; oficial ya es barato) |
| Amazon Music Unlimited | sin datos | S/ 8.80 (base anterior +10%) | US$ 11.99 ≈ S/ 40.20 | Estimado |
| Deezer Premium | S/ 10.50 | S/ 11.60 | US$ 11.99 ≈ S/ 40.20 | Media (GamsGo) |
| Tidal | S/ 8.50 | S/ 9.40 | US$ 11.99 ≈ S/ 40.20 | Media (rango S/ 5–12) |

## Videojuegos (PEN)

| Producto | Reventa típica | Nuestro precio | Oficial | Confianza |
| --- | --- | --- | --- | --- |
| PS Plus Essential 1 mes | S/ 19.00 | S/ 20.90 | US$ 6.99 ≈ S/ 23.40 | Alta (Play Perú Store) |
| PS Plus Extra 1 mes | S/ 49.00 | S/ 53.90 | US$ 10.49 ≈ S/ 35.20 → sin comparación | Alta |
| PS Plus Deluxe 1 mes | S/ 52.00 | S/ 57.20 | US$ 11.99 ≈ S/ 40.20 → sin comparación | Media |
| Xbox GP Core (hoy "Essential") | sin datos | S/ 38.50 (base anterior +10%) | US$ 9.99 ≈ S/ 33.50 → sin comparación | Estimado |
| Xbox GP Standard (hoy "Premium") | sin datos | S/ 33.00 (base anterior +10%) | US$ 14.99 ≈ S/ 50.20 | Estimado |
| PC Game Pass | sin datos | S/ 38.50 (base anterior +10%) | US$ 13.99 ≈ S/ 46.90 | Estimado |
| Xbox GP Ultimate | S/ 36.00 | S/ 39.60 | US$ 22.99 ≈ S/ 77.10 | Alta |

Nota: en octubre 2025 Microsoft renombró Core→Essential y Standard→Premium;
conviene actualizar los nombres de estos planes en el catálogo.

## IA (USD salvo ChatGPT Plus)

| Producto | Reventa típica | Nuestro precio | Oficial | Confianza |
| --- | --- | --- | --- | --- |
| ChatGPT Plus (PEN) | S/ 20.00 | S/ 22.00 | US$ 20 ≈ S/ 67.00 | Alta |
| Claude Pro | US$ 6.00 | US$ 6.60 | US$ 20.00 | Media |
| Claude Max | US$ 50.00 | US$ 55.00 | US$ 100.00 | Baja (casi no se revende) |
| Cursor Pro | US$ 12.00 | US$ 13.20 | US$ 20.00 | Media |
| GitHub Copilot | US$ 5.00 | US$ 5.50 | US$ 10.00 | Baja ("60% dto." sin cifra) |
| Microsoft Copilot Pro | US$ 6.99 | US$ 7.70 | US$ 20 (M365 Premium; Copilot Pro fue retirado) | Media |
| Perplexity Pro | US$ 3.00 | US$ 3.30 | US$ 20.00 | Media (mercado de vouchers anuales) |
| SuperGrok | US$ 5.00 | US$ 5.50 | US$ 30.00 | Media |
| ElevenLabs | US$ 12.00 | US$ 13.20 | US$ 22.00 (Creator) | Media |
| Google AI Plus | US$ 3.00 | US$ 3.30 | US$ 7.99 | Media |
| Google AI Pro | US$ 4.00 | US$ 4.40 | US$ 19.99 | Media |
| Google AI Ultra | sin datos | US$ 5.50 (base anterior +10%) | US$ 99.99 | Estimado |

## Productividad, VPN y educación (PEN)

| Producto | Reventa típica | Nuestro precio | Oficial | Confianza |
| --- | --- | --- | --- | --- |
| Adobe Creative Cloud (perfil) | sin dato del perfil | S/ 22.00 (base anterior +10%) | ~US$ 55 ≈ S/ 184.40 | Estimado |
| Canva Pro | S/ 13.50 | S/ 14.90 | S/ 44.90 | Alta |
| Google One (cupo 2 TB) | S/ 7.00 | S/ 7.70 | 2 TB oficial ≈ S/ 33.50 | Media |
| Microsoft 365 (cupo familiar) | S/ 19.00 | S/ 20.90 | S/ 30.99 (Personal) | Media |
| ExpressVPN | ~S/ 9.00 | S/ 9.90 | US$ 15.99 ≈ S/ 53.60 | Estimado |
| NordVPN | ~S/ 8.00 | S/ 8.80 | US$ 14.99 ≈ S/ 50.20 | Media |
| Proton VPN | ~S/ 7.00 | S/ 7.70 | US$ 9.99 ≈ S/ 33.50 | Media |
| Surfshark | ~S/ 9.00 | S/ 9.90 | US$ 16.45 ≈ S/ 55.10 | Estimado |
| Duolingo Super | S/ 15.00 | S/ 16.50 | sin dato oficial Perú → sin comparación | Media |
| Duolingo Max | ~S/ 20.00 | S/ 22.00 | ~S/ 30.00 (reporte de usuarios) | Baja |

## Precios oficiales de referencia (Perú, sep-2026)

Netflix Estándar S/ 40.90 · Premium S/ 52.90 · miembro extra S/ 8.90 ·
Disney+ S/ 49.90–68.90 · Max S/ 40.90 · Prime S/ 25.90 · Apple TV+ S/ 24.90 ·
Paramount+ S/ 18.90–31.90 · Crunchyroll S/ 19.90–23.90 · ViX S/ 22.90 ·
Spotify S/ 20.90 · Apple Music S/ 16.90 · PS Plus US$ 6.99/10.49/11.99 ·
Xbox (USD ref.) 9.99/14.99/13.99/22.99 · ChatGPT Plus US$ 20 · Claude Pro
US$ 20 · Canva Pro S/ 44.90 · Microsoft 365 Personal S/ 30.99.

Fuentes principales: selectra.com.pe, help.disneyplus.com, rpp.pe,
elcomercio.pe, ayuda.vix.com, spotify.com/pe, store.playstation.com/es-pe,
news.xbox.com, claude.com/pricing, microsoft.com/es-pe, hot.pe,
playperustore.com, peruvianplay.com, gudfy.com, gamsgo.com, elgrupito.com,
cuentaperu.com, davcstore.com.

## Cómo actualizar los precios en el futuro

1. Editar los montos de `source_prices` en `db/pricing-catalog.sql`
   (`source_amount_minor` = nueva tarifa base en centavos,
   `official_amount_minor` = nuevo oficial en centavos; 0 = sin comparación).
2. Ejecutar `npm run db:seed` (o aplicar solo `db/pricing-catalog.sql` con
   psql). El script es idempotente y recalcula duraciones, mercados,
   comparaciones y porcentajes de descuento.
