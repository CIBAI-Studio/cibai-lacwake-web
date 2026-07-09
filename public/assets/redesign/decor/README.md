# Assets decorativos acuarela/botánicos — rediseño home ([CIBA-2305](/CIBA/issues/CIBA-2305))

Elementos vectoriales para el rediseño claro de lacwake.es ([CIBA-2304](/CIBA/issues/CIBA-2304)).
Todos **SVG** hand-authored, sin texto incrustado, muy ligeros (< 1.5 KB c/u).
Paleta: cream `#FAF7F2` · turquesa claro `#E0F4F4` · teal `#0D9488` · sun `#f59e0b`.

Preview visual: `../decor-contact-sheet.png`.

## Inventario

| Archivo | Uso sugerido | viewBox | Recolor |
|---|---|---|---|
| `leaf-sprig.svg` | Motivo botánico para márgenes / esquinas de sección | 120×200 | ✅ `currentColor` |
| `botanical-branch.svg` | Rama amplia para márgenes laterales (con bayas sun) | 260×340 | ✅ `currentColor` |
| `birds-flock.svg` | Bandada de aves, accent sobre cielo/hero | 240×100 | ✅ `currentColor` |
| `wave-divider.svg` | Separador de sección suave (una onda) | 1440×80 | ✅ `currentColor` |
| `water-waves.svg` | Ondas de agua a todo ancho, fondo footer / separador | 1440×220 | ⛔ paleta fija (multi-opacidad) |
| `mountain-range.svg` | Silueta serralada Baells (3 planos + sol), base footer/hero | 1440×260 | ⛔ paleta fija |
| `watercolor-blob.svg` | Mancha acuarela orgánica (feTurbulence), fondo de sección | 400×400 | ⛔ gradiente fijo |

## Recolor con `currentColor` — IMPORTANTE

Los assets marcados ✅ heredan el color de texto vía `currentColor`, con **fallback teal `#0D9488`**
declarado en el atributo `color` del `<svg>` raíz.

⚠️ El recolor **solo funciona si el SVG se inlinea en el DOM** (inline `<svg>`, `astro-icon`,
import `?raw`, o `mask-image` en CSS). Cargado como `<img src="...">` el SVG se aísla y **no**
hereda el `color` del CSS externo → se renderiza con el fallback teal. Para las ondas de sección
sobre fondo teal, inlinear y aplicar `style="color:#FAF7F2"` (o la clase Tailwind `text-[color]`).

### Ejemplos Astro

```astro
---
// Inline crudo → recoloreable con currentColor
import leaf from "../assets/redesign/decor/leaf-sprig.svg?raw";
---
<span class="text-teal-600" set:html={leaf} />           <!-- teal -->
<span style="color:#FAF7F2" set:html={leaf} />           <!-- cream sobre banner teal -->

<!-- Full-width fijo (footer): <img> basta, no necesita recolor -->
<img src="/assets/redesign/decor/water-waves.svg" alt="" aria-hidden="true" class="w-full" />
```

Los `water-waves` / `mountain-range` usan `preserveAspectRatio="none"` para estirarse a todo ancho.
`watercolor-blob` es decorativo: aplicar `aria-hidden` y `pointer-events:none`, escalar con `width`.
