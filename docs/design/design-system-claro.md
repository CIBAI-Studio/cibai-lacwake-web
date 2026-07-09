# Design System Claro — Home lacwake.es

**Ticket:** [CIBA-2305](/CIBA/issues/CIBA-2305) · **Padre:** [CIBA-2304](/CIBA/issues/CIBA-2304) (mockup aprobado por el Board)
**Repo:** `CIBAI-Studio/cibai-lacwake-web` (Astro + Tailwind v4 · tokens en `src/styles/global.css`)
**Autor:** Designer · **Para:** Frontend (integración) + QA (contraste)

Rediseño de identidad **clara** (cream + botánico/acuarela) que sustituye el esquema oscuro lake-blue actual.
Reutiliza la tipografía ya en producción (Space Grotesk + Inter). Los assets decorativos viven en
`public/assets/redesign/decor/` (ver su `README.md` y `decor-contact-sheet.png`).

---

## 1. Paleta semántica clara

| Token semántico | Hex | Uso |
|---|---|---|
| `surface` | `#FAF7F2` (cream) | Fondo base de página |
| `surface-tint` | `#E0F4F4` (turquesa claro) | Fondos de sección alternos, chips, hover suave |
| `card` | `#FFFFFF` | Tarjetas de actividad, header translúcido |
| `accent-teal` | `#0D9488` | Color de marca principal (banners, iconos, fills decorativos) |
| `accent-teal-strong` | `#0F766E` (teal-700) | **Texto/enlaces teal** (el `#0D9488` NO pasa AA como texto pequeño) |
| `accent-sun` | `#F59E0B` | Acento cálido: **fondos** de botón/badge, líneas, puntos, bayas |
| `accent-sun-strong` | `#D97706` (sun-600) | Acento sun cuando necesita algo más de contraste sobre blanco |
| `text-primary` | `#1E293B` | Titulares y cuerpo principal |
| `text-secondary` | `#475569` (slate-600) | Texto secundario (⚠️ **no** `#64748b`: 4.45 falla AA sobre cream) |
| `text-on-teal` | `#FFFFFF` / `#E0F4F4` | Texto sobre banner teal |
| `border` | `#E7E1D8` / `#E0F4F4` | Bordes cream y turquesa |

> El mockup lista `text-secondary #64748b`. Se **corrige a `#475569`** porque `#64748b` sobre cream da
> 4.45:1 (bajo el umbral AA-normal de 4.5). `#475569` da 7.09:1. Ver §5.

### Mapeo a `@theme` (Tailwind v4 · `global.css`)

Los grises `slate` (`#1e293b`, `#475569`, `#64748b`) ya existen en Tailwind por defecto
(`text-slate-800`, `text-slate-600`, `text-slate-500`). Añadir solo la marca:

```css
@theme {
  --color-surface:        #FAF7F2;
  --color-surface-tint:   #E0F4F4;
  --color-teal-500:       #14b8a6;
  --color-teal-600:       #0D9488;  /* accent-teal */
  --color-teal-700:       #0F766E;  /* accent-teal-strong (texto/enlaces) */
  /* sun-400/500/600 ya existen: #fbbf24 / #f59e0b / #d97706 */
}
```

---

## 2. Tipografía

Fuentes ya cargadas en `global.css` (Google Fonts): **Space Grotesk** (headings) + **Inter** (body).

| Rol | Familia | Tamaño | Peso | Line-height | Tracking |
|---|---|---|---|---|---|
| `overline` | Inter | 11px | 600 | 1.2 | `+0.08em` UPPERCASE |
| `h1` (hero) | Space Grotesk | 44–64px (clamp) | 700 | 1.05 | `-0.01em` |
| `h2` (sección) | Space Grotesk | 32px | 700 | 1.15 | `-0.01em` |
| `h3` (card) | Space Grotesk | 20–22px | 600 | 1.2 | normal |
| `body` | Inter | 16px | 400 | 1.6 | normal |
| `body-lead` | Inter | 18px | 400/500 | 1.6 | normal |
| `caption` | Inter | 14px | 500 | 1.45 | normal |
| `badge-num` | Space Grotesk | 28–40px | 700 | 1 | normal |

Escala modular ~1.25. Mobile: h1 44px, h2 28px. `overline` en `accent-teal-strong` o `accent-sun-strong`
según fondo (ver §5).

---

## 3. Componentes clave (especificación visual)

### 3.1 Header translúcido claro
- `background: rgba(255,255,255,0.80)` + `backdrop-filter: blur(12px)`.
- `border-bottom: 1px solid #E7E1D8` (cream). Sombra al hacer scroll: `0 2px 12px rgba(13,148,136,.08)`.
- Altura 64–72px. Logo izquierda; nav Inter 15px `text-primary`; CTA "Reservar" a la derecha (botón sun, §3.3).
- Nav hover: subrayado `accent-teal` 2px. Estado activo: `text-teal-700`.

### 3.2 Card de actividad
- Contenedor `card` blanco, `border-radius: 16px`, `border: 1px solid #E0F4F4`,
  sombra `0 4px 18px rgba(13,148,136,.06)`; hover `translateY(-4px)` + sombra `.12`.
- **Foto 4:3** arriba (las webp de `public/assets/redesign/` son 16:9 → recortar a 4:3 con `object-cover`),
  `border-radius` superior 16px.
- **Badge tipo** (INDIVIDUAL / EN PAREJA / GRUPO): pill sobre la foto, esquina sup-izq.
  Fondo `rgba(255,255,255,.9)`, texto `overline` `text-teal-700`. (No usar sun de fondo con texto blanco, §5.)
- **Título** `h3` `text-primary`. **Descripción** `body` `text-secondary (#475569)`.
- **Botón** "Reservar →": ver §3.3 (botón sun con **texto oscuro**).

### 3.3 Botones
| Variante | Fondo | Texto | Nota AA |
|---|---|---|---|
| **Primario (sun)** | `#F59E0B` | **`#1E293B` (oscuro)** | ✅ 6.81:1. ❌ **Nunca texto blanco** (2.15:1). |
| Primario sobre teal | `#F59E0B` | `#1E293B` | Igual; el naranja resalta sobre banner teal. |
| Secundario | transparente | `text-teal-700` | Borde 1.5px `accent-teal`. Hover fill `surface-tint`. |
| Ghost/nav | transparente | `text-primary` | Hover `surface-tint`. |

`border-radius: 10px` (o `999px` pill según mockup), padding `12px 20px`, Inter 15px/600. Flecha "→" como sufijo.

### 3.4 Badge numerado 01 / 02 / 03
- Numeral `badge-num` (Space Grotesk bold, 28–40px).
- ⚠️ Sun como **texto** de numeral sobre cream falla AA (2.01:1) incluso a tamaño grande. Dos patrones válidos:
  - **A (recomendado):** numeral en `text-primary` o `text-teal-700`, con **acento sun decorativo**
    (subrayado, punto, o círculo de fondo sun con el número en `#1E293B`).
  - **B:** numeral sun **puramente decorativo** (`aria-hidden`), acompañado siempre de un label textual legible.
- Nunca usar el numeral sun como único portador de información sin cumplir contraste.

### 3.5 Banner CTA turquesa
- `background: #0D9488` (o degradado `#0D9488 → #0F766E`). `border-radius: 24px`, padding generoso.
- Titular `h2` **blanco** (`#fff` sobre `#0D9488` = 3.74:1 → válido solo texto grande ≥24px/bold).
  Para texto **secundario pequeño** sobre el banner usar `#FFFFFF` o `#E0F4F4` pero **subir el fondo a
  `#0F766E`** (blanco 5.47:1) — con `#0D9488` el body pequeño no llega a 4.5.
- CTA = botón sun con texto oscuro (§3.3). Decorar con `water-waves.svg` / `birds-flock.svg` (inline, color cream).

### 3.6 Footer
- Fondo `surface` cream con **`water-waves.svg`** a todo ancho en el borde superior (ilustración de agua)
  y opcional `mountain-range.svg` de base. Columnas: **Actividades · Contacto · Legal**.
- Títulos de columna `overline` `text-teal-700`; links `body` `text-secondary`, hover `text-teal-700`.
- Franja inferior © + redes. Decorar márgenes con `leaf-sprig.svg` / `botanical-branch.svg` (inline, teal).

### 3.7 Decoración de secciones
- Alternar `surface` (cream) y `surface-tint` (turquesa) entre secciones; unir con `wave-divider.svg`
  (inline, `color` = color de la sección siguiente).
- Márgenes laterales con botánico (`leaf-sprig` / `botanical-branch`) a baja opacidad (0.5–0.8),
  `aria-hidden`, `pointer-events:none`, fuera del flujo (absolute), sin tapar texto.
- `watercolor-blob.svg` como fondo suave detrás de bloques destacados.

---

## 4. Espaciado, radios y sombras
- **Grid/spacing:** escala 4px (4/8/12/16/24/32/48/64/96). Secciones `padding-block: 4rem` (mobile) → `6rem` (desktop), ya en `.section`.
- **Container:** `max-width: 1280px` (`.container-site` existente).
- **Radios:** card 16px · banner 24px · botón 10px/pill · pill/badge 999px.
- **Sombras (tinte teal, no negro):** sm `0 2px 8px rgba(13,148,136,.06)` · md `0 4px 18px rgba(13,148,136,.08)` · lg `0 12px 32px rgba(13,148,136,.12)`.

---

## 5. Reglas de contraste AA (verificadas)

Ratios calculados (WCAG 2.1). Umbrales: **normal ≥ 4.5** · **grande (≥24px o ≥18.66px bold) ≥ 3.0**.

| Combinación | Ratio | Veredicto |
|---|---|---|
| `text-primary #1E293B` / cream `#FAF7F2` | **13.69** | ✅ normal |
| `text-primary #1E293B` / white | **14.63** | ✅ normal |
| `text-secondary #475569` / cream | **7.09** | ✅ normal |
| `text-secondary #64748b` / cream | 4.45 | ⚠️ **falla AA-normal** → usar `#475569` |
| `teal-700 #0F766E` / cream | **5.12** | ✅ normal (enlaces/texto teal) |
| `teal-700 #0F766E` / white | **5.47** | ✅ normal |
| `teal-600 #0D9488` / cream (texto) | 3.5 | ⚠️ solo texto grande → para texto usar teal-700 |
| `white` / `teal-600 #0D9488` (banner) | 3.74 | ✅ solo grande (≥24px/bold); pequeño → fondo teal-700 |
| `white` / `teal-700 #0F766E` (banner) | **5.47** | ✅ normal |
| **`white` / sun `#F59E0B` (botón)** | **2.15** | ❌ **PROHIBIDO** — usar texto `#1E293B` |
| `text-primary #1E293B` / sun `#F59E0B` (botón) | **6.81** | ✅ normal |
| sun `#F59E0B` (numeral) / cream | 2.01 | ❌ no como texto — decorativo (§3.4) |
| sun-600 `#D97706` / cream | 2.98 | ❌ no como texto pequeño |

**Reglas duras para Frontend/QA:**
1. **Botón/CTA sun → texto oscuro `#1E293B`, jamás blanco.**
2. **Texto secundario = `#475569`** (no `#64748b`).
3. **Texto/enlaces teal = `#0F766E`** (teal-700); `#0D9488` solo para titulares grandes, fills e iconografía.
4. **Body pequeño sobre banner** → fondo `#0F766E`, no `#0D9488`.
5. **Numerales/acentos sun** son decorativos: nunca únicos portadores de información sin label legible.
6. Foco visible ≥ 3:1 (el `:focus-visible` actual usa `#0284c7`; sobre cream = 3.7:1 ✅, mantener o cambiar a teal-700).

---

## 6. Handoff a Frontend
- Assets listos en `public/assets/redesign/decor/` (7 SVG < 1.5 KB c/u) + preview `decor-contact-sheet.png`.
- Fotos de actividad ya existentes en `public/assets/redesign/*.webp` (recortar a 4:3 en las cards).
- Recolor de decorativos: **inlinear** el SVG (`?raw` / astro-icon / mask), no `<img>` (ver decor/README).
- Este documento cubre paleta, tipografía, componentes y AA — suficiente para implementar sin más clarificaciones.
