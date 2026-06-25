# Design System — Lacwake

> Fuente de Verdad Global. Generado con `ui-ux-pro-max` para el proyecto Lacwake (actividades acuáticas en pantano).
> **No editar manualmente.** Actualizar ejecutando el script con `--persist`.

---

## 1. Producto

| Campo | Valor |
|---|---|
| Nombre | Lacwake |
| Tipo | Servicio — Actividades de ocio al aire libre / Turismo acuático |
| Industria | Turismo, Deporte outdoor, Naturaleza |
| Público objetivo | Familias, parejas, turistas, entusiastas del outdoor (25-55 años) |
| Tono de marca | Energético · Fresco · Aventurero · Accesible · Natural · Mediterráneo |

---

## 2. Estilo Visual

**Estilo primario:** Premium Outdoor — Clean modern con elementos orgánicos inspirados en el agua y la naturaleza.

| Parámetro | Valor | Descripción |
|---|---|---|
| Variance | 7/10 | Layouts orgánicos con asimetría controlada |
| Motion | 6/10 | Animaciones con significado, spring physics |
| Density | 3/10 | Espacios amplios, aireados |

**Elementos clave:**
- Hero fullscreen con vídeo de fondo
- Nav glass morphism flotante (blur backdrop)
- Cards con imagen prominente y CTA claro
- Secciones con alternancia imagen-texto
- Footer limpio y funcional

---

## 3. Paleta de Color

### Colores primitivos (CSS custom properties)

```css
@theme {
  /* Lake Blue — Agua profunda del pantano */
  --color-lake-50:  #f0f9ff;
  --color-lake-100: #e0f2fe;
  --color-lake-200: #bae6fd;
  --color-lake-300: #7dd3fc;
  --color-lake-400: #38bdf8;
  --color-lake-500: #0ea5e9;
  --color-lake-600: #0284c7;
  --color-lake-700: #0369a1;
  --color-lake-800: #075985;
  --color-lake-900: #0c4a6e;
  --color-lake-950: #082f49;

  /* Sun Gold — Sol del verano */
  --color-sun-50:  #fffbeb;
  --color-sun-100: #fef3c7;
  --color-sun-400: #fbbf24;
  --color-sun-500: #f59e0b;
  --color-sun-600: #d97706;

  /* Nature Green — Vegetación ribera */
  --color-nature-400: #34d399;
  --color-nature-500: #10b981;
  --color-nature-600: #059669;

  /* Stone Neutral */
  --color-stone-50:  #fafaf9;
  --color-stone-100: #f5f5f4;
  --color-stone-200: #e7e5e4;
  --color-stone-400: #a8a29e;
  --color-stone-600: #57534e;
  --color-stone-800: #292524;
  --color-stone-950: #0c0a09;
}
```

### Tokens semánticos

| Token | Valor | Uso |
|---|---|---|
| `--color-primary` | `--color-lake-600` `#0284C7` | Acciones principales, links |
| `--color-primary-light` | `--color-lake-400` `#38BDF8` | Hovers, estados activos |
| `--color-primary-dark` | `--color-lake-800` `#075985` | Texto sobre fondos claros |
| `--color-accent` | `--color-sun-500` `#F59E0B` | CTAs "Reservar", elementos destacados |
| `--color-accent-dark` | `--color-sun-600` `#D97706` | Hover de CTA |
| `--color-surface` | `#FFFFFF` | Fondos de cards, nav |
| `--color-bg` | `--color-stone-50` `#FAFAF9` | Fondo principal de página |
| `--color-text-primary` | `--color-stone-950` → `#0C0A09` | Texto principal |
| `--color-text-secondary` | `--color-stone-600` `#57534E` | Texto secundario, subtítulos |
| `--color-text-muted` | `--color-stone-400` `#A8A29E` | Metadatos, captions |
| `--color-border` | `--color-stone-200` `#E7E5E4` | Bordes de cards, divisores |

### Uso en Tailwind 4

Con `@theme` en el CSS, se usan como utilidades:
- `bg-lake-600`, `text-lake-800`, `border-sun-500`

---

## 4. Tipografía

### Familias de fuente

| Rol | Familia | Peso | Uso |
|---|---|---|---|
| Heading | **Space Grotesk** | 500, 600, 700 | Títulos H1-H3, nombre de actividades |
| Body | **Inter** | 400, 500 | Texto corrido, descripciones |
| UI | **Inter** | 500, 600 | Botones, labels, nav |

### Escala tipográfica

| Token | Size | Line-height | Weight | Uso |
|---|---|---|---|---|
| `text-display` | clamp(3rem, 8vw, 6rem) | 1.05 | 700 | Hero principal |
| `text-h1` | clamp(2rem, 5vw, 3.5rem) | 1.15 | 700 | Títulos de página |
| `text-h2` | clamp(1.5rem, 3.5vw, 2.25rem) | 1.2 | 600 | Títulos de sección |
| `text-h3` | clamp(1.125rem, 2.5vw, 1.5rem) | 1.3 | 600 | Nombres de actividad |
| `text-body-lg` | 1.125rem (18px) | 1.7 | 400 | Párrafos principales |
| `text-body` | 1rem (16px) | 1.6 | 400 | Texto estándar |
| `text-small` | 0.875rem (14px) | 1.5 | 400 | Captions, metadatos |
| `text-xs` | 0.75rem (12px) | 1.4 | 500 | Labels, badges |

### Importación Google Fonts

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
```

---

## 5. Espaciado y Layout

### Sistema de espaciado (base 4px)

| Token | Valor | Uso |
|---|---|---|
| `space-1` | 4px | Micro-gaps |
| `space-2` | 8px | Gaps pequeños, paddings tight |
| `space-3` | 12px | Padding interno de elementos pequeños |
| `space-4` | 16px | Padding estándar |
| `space-6` | 24px | Gaps entre elementos relacionados |
| `space-8` | 32px | Secciones pequeñas |
| `space-12` | 48px | Padding de sección desktop |
| `space-16` | 64px | Gaps entre secciones |
| `space-20` | 80px | Secciones medianas |
| `space-24` | 96px | Secciones grandes |
| `space-32` | 128px | Secciones hero secondary |

### Breakpoints

| Nombre | Valor | Dispositivo |
|---|---|---|
| `sm` | 375px | iPhone SE / móvil pequeño |
| `md` | 768px | Tablet portrait |
| `lg` | 1024px | Tablet landscape / laptop |
| `xl` | 1280px | Desktop |
| `2xl` | 1440px | Desktop grande |

### Contenedores

```css
.container-site {
  max-width: 1280px;
  margin-inline: auto;
  padding-inline: 1.25rem; /* mobile */
}

@media (min-width: 768px) {
  .container-site { padding-inline: 2rem; }
}

@media (min-width: 1024px) {
  .container-site { padding-inline: 3rem; }
}
```

---

## 6. Componentes

### NavIsland (Glass Morphism)

```
- Position: fixed top-4 left-1/2 -translate-x-1/2 z-50
- Background: bg-white/10 backdrop-blur-md
- Border: border border-white/20
- Border-radius: rounded-full (pill) o rounded-2xl
- Shadow: shadow-lg shadow-black/5
- Scroll behavior: cambiar a bg-white/95 tras 50px scroll
- Items: Inicio · Actividades · Contactar · [Reservar CTA]
- Mobile: hamburger menu con drawer
- Altura: h-14 (desktop) h-12 (mobile)
```

### Hero

```
- Fullscreen: min-h-dvh (nunca h-screen)
- Video: <video autoplay muted loop playsinline>
- Overlay: gradient from-black/60 via-black/30 to-transparent
- Content: centered, text-white
- Animación: Framer Motion spring (stagger entrada)
- Fallback: imagen si no hay vídeo
- CTA: botón Reservar (accent color)
```

### ActivityCard

```
- Layout: flex-col, rounded-2xl, overflow-hidden
- Image: aspect-[4/3], object-cover
- Content: p-6
- Tag: pequeño, color primario
- Title: text-h3, font-heading
- Description: text-body text-secondary, 2-3 líneas
- CTA: "Ver actividad" secondary link + "Reservar" primary button
- Hover: -translate-y-1 shadow-xl (Framer Motion)
```

### Botón Reservar (CTA primario)

```
- Background: bg-sun-500 text-white
- Hover: bg-sun-600
- Border-radius: rounded-xl
- Padding: px-6 py-3 (desktop) px-4 py-2.5 (mobile)
- Font: font-ui font-semibold text-sm
- Icono: arrow-right (Phosphor Icons)
- Transition: 200ms ease-out
- Min width touch: 44px height
```

---

## 7. Animación

### Tokens de Motion

| Token | Valor |
|---|---|
| `duration-fast` | 150ms |
| `duration-normal` | 250ms |
| `duration-slow` | 400ms |

### Configuración Spring (Framer Motion)

```ts
// Entrada de elementos hero
const heroSpring = {
  type: 'spring',
  stiffness: 100,
  damping: 20,
  delay: 0.1
}

// Hover de cards
const cardHover = {
  y: -4,
  transition: { type: 'spring', stiffness: 300, damping: 20 }
}

// Fade + slide up para secciones
const fadeSlideUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 80, damping: 18 }
  }
}

// Stagger de cards
const staggerContainer = {
  visible: {
    transition: { staggerChildren: 0.08 }
  }
}
```

### Reglas de Motion

- `prefers-reduced-motion`: siempre respetar con `@media (prefers-reduced-motion: reduce)`
- No animar `width`, `height`, `top`, `left` — solo `transform` y `opacity`
- Duración máxima: 400ms para transiciones complejas
- Exit siempre más rápido que enter (60-70% de la duración)

---

## 8. Efectos Visuales

### Glass Morphism (Nav)

```css
background: rgba(255,255,255,0.08);
backdrop-filter: blur(16px) saturate(180%);
-webkit-backdrop-filter: blur(16px) saturate(180%);
border: 1px solid rgba(255,255,255,0.15);
box-shadow: 0 4px 24px rgba(0,0,0,0.08);
```

### Sombras de Cards

```css
/* Default */
box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 4px 8px rgba(0,0,0,0.04);
/* Hover */
box-shadow: 0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
```

### Overlay Hero

```css
background: linear-gradient(
  to bottom,
  rgba(0,0,0,0.55) 0%,
  rgba(0,0,0,0.3) 50%,
  rgba(0,0,0,0.6) 100%
);
```

---

## 9. Accesibilidad (WCAG 2.1 AA)

- Contraste mínimo texto/fondo: 4.5:1 (normal), 3:1 (grande)
- Focus visible: ring-2 ring-lake-500 ring-offset-2
- Alt text en todas las imágenes significativas
- Labels en todos los inputs
- Navegación por teclado completa
- `aria-label` en botones sin texto visible
- `aria-current="page"` en nav activo
- `prefers-reduced-motion`: animaciones reducidas/eliminadas

---

## 10. SEO & Performance

- `sitemap.xml` generado con `@astrojs/sitemap`
- `robots.txt` en `/public/`
- Meta tags Open Graph completos en cada página
- Imágenes: WebP/AVIF, `loading="lazy"` en below-fold
- Fuentes: `display=swap` en Google Fonts + `preconnect`
- LCP target: < 2.5s
- CLS target: < 0.1
- FID/INP target: < 200ms

---

## 11. Páginas del Proyecto

| Ruta | Descripción | Layout |
|---|---|---|
| `/` | Home: hero vídeo + actividades + footer | LayoutBase |
| `/actividades/kayak` | Página kayak | LayoutActividad |
| `/actividades/hidropedales` | Hidropedales | LayoutActividad |
| `/actividades/barcas` | Barcas a remos | LayoutActividad |
| `/actividades/[slug]` | Template genérico | LayoutActividad |
| `/contactar` | Contacto, teléfono, mapa | LayoutBase |
| `/aviso-legal` | Texto legal CMO | LayoutLegal |
| `/politica-privacidad` | Privacidad CMO | LayoutLegal |
| `/politica-cookies` | Cookies CMO | LayoutLegal |
| `/condiciones-contratacion` | Condiciones CMO | LayoutLegal |

---

## 12. Anti-Patterns (EVITAR)

- ❌ `h-screen` — usar `min-h-dvh`
- ❌ Gradientes/sombras aleatorias — usar los tokens definidos
- ❌ Emojis como iconos — usar Phosphor Icons
- ❌ Colores hardcoded en componentes — usar variables CSS
- ❌ Animar `width`/`height`/`top`/`left` — solo `transform`/`opacity`
- ❌ `console.log` en producción
- ❌ Texto < 16px en mobile
- ❌ Scroll horizontal en mobile
- ❌ Imágenes sin dimensiones declaradas (CLS)
- ❌ Nav mezclada en el flujo del documento (usar `position: fixed`)
