# Divisores de sección — home lacwake.es (CIBA-2344)

Assets SVG decorativos para separar los bloques de la home. Coherentes con el
design system claro (accent sun `#f59e0b`, superficies lake, estética de agua/olas
del Footer). **Solo decorativos — no alteran contenido/copy.**

## Archivos

| Archivo | Forma | viewBox | Uso |
|---|---|---|---|
| `wave.svg` | Onda orgánica simple | `0 0 1440 90` | Transiciones con contraste (claro↔oscuro / claro↔color) |
| `wave-layered.svg` | Onda de doble capa (profundidad tipo agua) | `0 0 1440 120` | Entradas destacadas (hacia CTA / Footer) |
| `slant.svg` | Inclinado diagonal | `0 0 1440 80` | Transiciones sutiles claro↔claro |

Todos: `preserveAspectRatio="none"` + `width="100%"` → **full-width fluido, sin
dimensiones fijas**. El color se controla con `fill="currentColor"`.

## Cómo funciona el color

El divisor se coloca en el **borde superior de la sección de destino**, se rellena
con el **color de fondo de esa sección** y se sube con `margin-bottom:-1px` (o
`margin-top` negativo) para tapar la costura. Así la ola "vierte" el color de la
sección siguiente sobre la anterior.

```html
<!-- Uso inline (recomendado en Astro: Fragment set:html o <svg> directo).
     currentColor hereda del contenedor. -->
<div class="divider" style="color:#082f49"> <!-- color de Footer -->
  <Fragment set:html={dividerWave} />
</div>
```
```css
.divider{ display:block; line-height:0; width:100%; height:64px; margin-bottom:-1px; }
.divider svg{ display:block; width:100%; height:100%; }
```

> ⚠️ `currentColor` **solo funciona con SVG inline** (o `<Fragment set:html>`), NO vía
> `<img src>` ni `background-image` (caveat del design system, [[project_lacwake_design_system_claro]]).
> Para `<img>`/CSS-bg hay que hornear el `fill` con el hex de la sección destino.

Para invertir la orientación (ola apuntando hacia abajo, al pie de una sección):
`transform: scaleY(-1)` o `rotate(180deg)`.

## Guía de emparejamiento (orden real de la home)

`Hero (vídeo, lake-900)` → `Actividades #fdfcfa` → `Why/Features #faf7f2` → `CTA #1C818F` → `Footer #082f49`

| Costura | Divisor sugerido | `fill` (color destino) |
|---|---|---|
| Hero ↔ Actividades | `wave.svg` | `#fdfcfa` |
| Actividades ↔ Why | `slant.svg` (sutil, ambos claros) | `#faf7f2` |
| Why ↔ CTA | `wave-layered.svg` | `#1C818F` (var `--color-cta-aqua`) |
| CTA ↔ Footer | `wave.svg` | `#082f49` (var `--color-lake-950`) |

Alternativa: usar `wave.svg` en todas las costuras para máxima coherencia; reservar
`slant.svg` para la transición claro↔claro (donde una ola casi no se percibe) y
`wave-layered.svg` para dar peso a la entrada del CTA.

## Notas

- Peso: `wave` 258 B · `wave-layered` 367 B · `slant` 198 B (muy por debajo del límite web).
- Sin texto ni glifos → sin problemas de accesibilidad; marcados `aria-hidden="true"`.
- Alto sugerido en CSS: 48–72 px desktop, 32–48 px móvil.
