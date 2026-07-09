# Iteración pastel + assets acuarela — home lacwake.es

**Ticket:** [CIBA-2324](/CIBA/issues/CIBA-2324) · **Padre:** [CIBA-2323](/CIBA/issues/CIBA-2323) (iteración vs referencia Board) · **Abuelo:** [CIBA-2303](/CIBA/issues/CIBA-2303)
**Repo:** `CIBAI-Studio/cibai-lacwake-web` (Astro + Tailwind v4 · tokens en `src/styles/global.css`)
**Autor:** Designer · **Para:** Frontend (integración) + QA (contraste)
**Referencia:** attachment `d27666af` (CIBA-2303). Comparar 1:1.

> **ITERACIÓN** sobre [design-system-claro.md](./design-system-claro.md) (CIBA-2305), **no** rediseño desde cero.
> Este doc solo **ajusta** los 5 bloques de color que el Board marcó como demasiado saturados y añade
> 5 assets acuarela nítidos. Todo lo demás (tipografía, spacing, radios, sombras, estructura) se mantiene.
> **Frontend:** no tocar tokens/estructura no listados aquí.

Los ratios son WCAG 2.1. Umbrales: **normal ≥ 4.5** · **grande (≥24px, o ≥18.66px bold) ≥ 3.0**.

---

## A) Tokens de color pastel (5 bloques, AA verificado)

### Punto 7 — Naranja **pastel** (botones/iconos)
El `accent-sun #F59E0B` actual está demasiado saturado. Se sustituye por un ámbar pastel suave para
**fondos** de botón/icono, y se define un `-ink` para cuando el naranja se usa como **texto**.

| Token | Hex | Uso | Par (fondo, texto) | Ratio | AA |
|---|---|---|---|---|---|
| `--color-sun-pastel` | `#F6B85C` | **fondo** botón "Reservar", iconos, puntos | texto `#1E293B` sobre `#F6B85C` | **8.31** | ✅ normal |
| — | — | ❌ prohibido | texto **blanco** sobre `#F6B85C` | 1.76 | ❌ nunca |
| `--color-sun-ink` | `#C2410C` | naranja **como texto** sobre cream/blanco | `#C2410C` sobre cream `#FAF7F2` | **4.85** | ✅ normal |

> Regla dura (igual que el DS claro): **botón sun → texto oscuro `#1E293B`, jamás blanco.**
> El botón de la referencia lleva texto claro por estética, pero **incumple AA** con estos hex → usar texto oscuro.

### Punto 7 — Iconos grid «Naturaleza» en **turquesa/teal pastel**
| Token | Hex | Uso | Par (fondo, texto) | Ratio | AA |
|---|---|---|---|---|---|
| `--color-teal-pastel` | `#5CC0B4` | **fill** decorativo del icono (trazo/silueta) | — (forma, no texto) | — | n/a |
| `--color-teal-ink` | `#0F766E` | label/texto teal junto al icono, sobre cream | `#0F766E` sobre cream | **5.12** | ✅ normal |

> El `#5CC0B4` es fill gráfico (icono line/solid); **no** vale como texto (2.18 sobre blanco).
> Para cualquier texto teal usar `#0F766E` (teal-700), como en el DS claro.

### Punto 8 — Badges de actividad (pills) en **azul pastel**
| Elemento | Hex | Par (fondo, texto) | Ratio | AA |
|---|---|---|---|---|
| Fondo badge (INDIVIDUAL / EN PAREJA / FAMILIAR / INTENSO…) | `--color-badge-blue: #CFE2F0` | — | — | — |
| Texto badge | `--color-badge-blue-ink: #1E3A5F` | `#1E3A5F` sobre `#CFE2F0` | **8.65** | ✅ normal |

> Reemplaza el patrón anterior (pill blanca translúcida). Coincide con la referencia: pills azul-pálido con
> texto azul-marino. Margen holgado (8.65) → válido a cualquier tamaño.

### Punto 6 — Footer **claro**
| Elemento | Hex | Par | Ratio | AA |
|---|---|---|---|---|
| Fondo | `--color-surface: #FAF7F2` (cream) | — | — | — |
| Textura de agua superior | asset `decor/agua-lateral.png` a todo ancho, opacidad ~0.5 | — | — | decorativo |
| Logo Lacwake | teal `#0D9488` | logo/gráfico grande sobre cream | 3.50 | ✅ (grande/gráfico) |
| Texto de columnas | `#1E293B` | `#1E293B` / cream | **13.69** | ✅ normal |
| Títulos de columna (overline) | `#0F766E` | `#0F766E` / cream | **5.12** | ✅ normal |
| Enlaces | `#0F766E` · hover `#0D9488` | `#0F766E` / cream | **5.12** | ✅ normal |

### Punto 5 — Franja CTA «¿Listo para tu aventura acuática?» en **agua/aguamarina**
| Elemento | Hex | Par (fondo, texto) | Ratio | AA |
|---|---|---|---|---|
| Fondo banda (color ancla AA) | `--color-cta-aqua: #1C818F` | — | — | — |
| Texto (titular + subtítulo + tel.) | **blanco** `#FFFFFF` | `#FFFFFF` sobre `#1C818F` | **4.58** | ✅ **normal** (todo tamaño) |
| Botón dentro de la banda | `#F6B85C` fondo + `#1E293B` texto | ver Punto 7 | 8.31 | ✅ |

> `#1C818F` es el **color sólido ancla** que garantiza AA para el blanco en cualquier tamaño.
> Para replicar el look «submarino» de la referencia se permite un **degradado decorativo** más claro
> arriba (`#3FA9B5` → `#1C818F`), **pero el texto debe apoyarse sobre la zona `#1C818F`** (parte media/baja)
> o llevar un scrim suave; nunca colocar texto blanco sobre el `#3FA9B5` claro (white/`#3FA9B5` ≈ 2.6, falla).

---

## B) Mapeo a `@theme` (Tailwind v4 · `global.css`)

Añadir (o ajustar) solo estos tokens; el resto del `@theme` del DS claro se conserva:

```css
@theme {
  /* Punto 7 — naranja pastel */
  --color-sun-pastel:     #F6B85C;  /* fondo botón/icono; texto SIEMPRE #1E293B */
  --color-sun-ink:        #C2410C;  /* naranja como texto sobre cream (AA 4.85) */
  /* Punto 7 — teal pastel */
  --color-teal-pastel:    #5CC0B4;  /* fill icono grid Naturaleza */
  --color-teal-ink:       #0F766E;  /* teal como texto (AA 5.12) — ya existente teal-700 */
  /* Punto 8 — badges azul pastel */
  --color-badge-blue:     #CFE2F0;
  --color-badge-blue-ink: #1E3A5F;
  /* Punto 5 — banda CTA aguamarina */
  --color-cta-aqua:       #1C818F;  /* ancla AA para texto blanco (4.58) */
  --color-cta-aqua-lite:  #3FA9B5;  /* solo degradado decorativo, NO fondo de texto */
}
```

> `accent-sun #F59E0B` deja de usarse como fondo de botón/badge; se mantiene disponible solo si algún
> elemento heredado lo requiere, pero **la home pasa a `--color-sun-pastel`**.

---

## C) Assets acuarela → `public/assets/redesign/decor/`

Nítidos, alta definición, **fondo transparente** (PNG alpha o SVG), **sin texto/glifos**.
Preview: `../decor-contact-sheet-pastel.png`.

| Archivo | Punto | Qué es | Colocación sugerida | Recolor |
|---|---|---|---|---|
| `garza-orilla.png` | 3 | Garza blanca entre juncos en la orilla (transparente) | Esquina **inferior-izquierda** de la sección «Naturaleza, agua y aventura». `aria-hidden`, `pointer-events:none`, opacidad 0.9–1 | ⛔ raster |
| `botanica-margen.png` | 3 | Rama botánica olivo+bayas ámbar, definida | Margen **derecho** (repetir/anclar a lo largo de la página); espejo horizontal para variar | ⛔ raster |
| `botanica-teal.png` | 3 | Rama botánica verde-teal, definida | Margen **izquierdo** (alterna con la olivo) | ⛔ raster |
| `agua-lateral.png` | 3 | Textura acuarela de agua/olas, translúcida | Laterales y **borde superior del footer** a todo ancho, opacidad 0.4–0.6 | ⛔ raster |
| `montanas-sol-puente.svg` | 4 | Line-art sutil montañas + sol + puente Baells + lavado papel | **Fondo esquina superior-derecha** de «11 formas de vivir el agua» | ✅ `currentColor` (fallback teal), aplicar opacidad 0.5–0.7 |

**Integración (recordatorio del DS claro):**
- Los raster van como `<img aria-hidden="true">` posicionados en absoluto, fuera del flujo, sin tapar texto.
- El SVG line-art es recoloreable: **inlinearlo** (`?raw` / `set:html`) y darle `style="color:#0D9488"` o clase
  `text-teal-600`, con opacidad baja (fondo de sección). Como `<img>` cae al fallback teal (ver decor/README).
- Márgenes botánicos a baja opacidad (0.6–0.85), `aria-hidden`, `pointer-events:none`, `position:absolute`.

---

## D) Resumen de reglas duras (Frontend/QA)
1. **Botón/CTA sun pastel → texto `#1E293B`, jamás blanco** (blanco 1.76 ❌).
2. **Naranja como texto** → `#C2410C` (no el pastel ni `#F59E0B`).
3. **Teal como texto** → `#0F766E`; `#5CC0B4` solo fill de icono.
4. **Badge azul** → fondo `#CFE2F0` + texto `#1E3A5F` (8.65).
5. **Banda CTA** → fondo ancla `#1C818F` + texto **blanco** (4.58); el degradado claro es decorativo y no
   puede quedar bajo el texto.
6. **Footer** → texto columnas `#1E293B`, títulos/enlaces `#0F766E`, logo teal `#0D9488`.
7. Assets con `aria-hidden` + `pointer-events:none`; no deben reducir el contraste del texto que tapen.
