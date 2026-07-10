# Contrato CMS + decisiones de diseño — Hero slides con bloques de texto rotatorios

**Feature:** [CIBA-2453](/CIBA/issues/CIBA-2453) · Petición Board vía [CIBA-2427](/CIBA/issues/CIBA-2427)
**Autor:** CTO · **Estado:** decisiones cerradas, listo para implementación.

Este documento es la **fuente de verdad compartida** entre los dos PRs (web + cms-api). Ambos deben exportarlo a `docs/` de su repo.

---

## 1. Modelo de datos — `slides[].blocks[]`

Hoy cada slide del contrato `content/hero` lleva los campos de texto **planos** (`overline`, `title`, `subtitle`, `cta_primary_*`, `cta_secondary_*`, `layout {h,v}`) más `duration` (segundos, 1–60) y `background`.

Se añade **un array `blocks[]` por slide**. Cada bloque tiene los mismos campos de texto que hoy vive plano en el slide, **más su propia posición y duración**:

```jsonc
{
  "id": "slide-0",
  "active": true,
  "order": 0,
  "background": { "type": "video", "video_url": "...", "fallback_image": "...", "image_url": "" },
  "duration": 45,            // duración TOTAL del slide en segundos (reloj maestro). Sin cambios.
  "typography": { ... },     // por-slide (sin cambios): tipografía compartida por todos los bloques
  "video": { ... },          // por-slide (sin cambios)
  "blocks": [
    {
      "id": "block-0",
      "overline": "LACWAKE · EMBALSE DE LA BAELLS",
      "title": "Aventuras acuáticas en la Baells",
      "subtitle": "Kayak, paddle surf y más…",
      "cta_primary_text": "Reservar ahora",
      "cta_primary_href": "/reservas",
      "cta_secondary_text": "Ver actividades",
      "cta_secondary_href": "/actividades",
      "layout": { "h": "left", "v": "bottom" },   // posición POR BLOQUE (antes era por-slide)
      "duration": 7                                // segundos que el bloque permanece visible (1–60). Opcional.
    },
    { "id": "block-1", "title": "...", "layout": { "h": "left", "v": "top" }, "duration": 8 },
    { "id": "block-2", "title": "...", "layout": { "h": "center", "v": "center" } }  // sin duration → ver §3
  ]
}
```

**Notas de campo:**
- `blocks[].layout` = `{ h: 'left'|'center'|'right', v: 'top'|'center'|'bottom' }`. La petición Board habla de "arriba/abajo" → como mínimo `v` es editable por bloque; se expone `{h,v}` completo por flexibilidad, con default heredado del layout del slide legacy.
- `typography` y `video` **siguen siendo por-slide** (compartidos por todos los bloques del slide). No se duplican por bloque en esta iteración.
- Nombres de campo de CTA: reusar los ya soportados por el parser web (`cta_primary_text/href`, `cta_secondary_text/href`). El admin ya usa `cta_text`/`cta_href` como alias legacy — mantener retrocompat de lectura.

## 2. Retrocompatibilidad (OBLIGATORIA)

**Regla de oro: ningún slide existente puede cambiar su render.**

- **Lectura (web `cms.ts`):** si un slide **no** trae `blocks[]` (o viene vacío), el parser **sintetiza** `blocks: [ bloqueÚnico ]` a partir de los campos planos actuales (`overline/title/subtitle/cta_*/layout`), con `duration: undefined`. Resultado: un solo bloque que ocupa todo el slide → **render idéntico al actual**.
- **Backend cms-api:** el endpoint sigue sirviendo los campos planos tal cual para slides legacy (passthrough). **No** se fuerza migración destructiva del contenido almacenado. Si el admin guarda `blocks[]`, se persiste tal cual; si guarda formato plano, se persiste plano.
- **Escritura (admin):** al abrir un slide legacy, el editor presenta sus campos planos **como Bloque 1**. Al guardar por primera vez con la nueva UI, puede escribir `blocks[]` — pero **debe seguir emitiendo** los campos planos del primer bloque a nivel slide (espejo) para que una web sin desplegar aún no rompa. → *belt-and-suspenders*: `blocks[]` es la fuente nueva; los campos planos del slide reflejan `blocks[0]`.

Con esto, **web y cms-api pueden desplegarse en cualquier orden** sin regresión.

## 3. Semántica de rotación de bloques (decisiones CTO)

Reloj maestro = `slide.duration` (o el intervalo global si el slide no fija duración). Los bloques rotan **dentro** de ese tiempo.

- **1 solo bloque** (caso legacy): **sin rotación**, visible todo el slide. Idéntico a hoy.
- **N bloques**: se muestran **secuencialmente** en orden del array. Cada bloque permanece `blocks[i].duration` segundos y luego transiciona al siguiente.
- **Bloque sin `duration`:**
  - Si es el **último** bloque → permanece visible hasta el fin del slide (*hold*).
  - Si es un bloque **intermedio** sin `duration` → default **6 s**.
- **Σ duraciones < duración del slide** (Board propuso, CTO acepta): el **último bloque permanece visible** hasta que acaba el slide. (Implementación natural: el último bloque no arranca timer de salida; el ciclo de bloques hace *hold* en el último hasta el cambio de slide.)
- **Σ duraciones ≥ duración del slide** (Board propuso, CTO acepta): el **cambio de slide corta** el ciclo de bloques. Los bloques que no llegaron a mostrarse simplemente no se muestran en esa vuelta.
- Al **volver** a un slide (siguiente vuelta del carrusel), el ciclo de bloques **reinicia** en `blocks[0]`.
- Rango válido de `blocks[].duration`: **1–60 s** (mismo rango que `slide.duration`). Fuera de rango o no numérico → tratar como "sin duration" (§ reglas de arriba). El parser no debe silenciar a 1/60; delega en el default.

## 4. Transición entre bloques

- Efecto de entrada/salida por bloque: **fade + desplazamiento vertical sutil** (opacity + `y`), reutilizando el patrón `childVariants` ya presente en `HeroCarousel.tsx` (~0.25–0.4 s).
- **`prefers-reduced-motion`:** sin motion — swap instantáneo. El carrusel ya detecta `reduced`; respetar esa rama también para los bloques.
- La transición de **bloque** es independiente de la transición de **media/slide** (crossfade del fondo). El fondo (vídeo/foto) **permanece** mientras rotan los bloques.

## 5. Límites y validación

- **Máximo de bloques por slide: 5.** Mínimo: **1** (nunca 0 bloques — el editor debe impedir borrar el último).
- Backend valida `blocks[]`: array, ≤5, cada bloque con al menos `title` no vacío (o se descarta en render). `duration` numérico 1–60 o ausente.
- Máximo de slides sigue igual (`HERO_MAX_SLIDES`).

## 6. Alcance por PR

**PR-A — `lacwake-cms-api` (FULLSTACK):** contrato backend (`content/hero` read/write acepta y valida `blocks[]`, passthrough legacy + espejo `blocks[0]`→campos planos) **+** admin `HeroSlidesEditor`: sección "Bloques de texto" por slide con añadir/quitar/reordenar bloques, cada uno con sus campos + `layout {h,v}` (posición) + `duration`. Mínimo 1 bloque. Slide legacy abre sus campos como Bloque 1.

**PR-B — `cibai-lacwake-web` (FRONTEND):** `cms.ts` parsea `blocks[]` (con síntesis legacy → bloque único, §2) y extiende el tipo `HeroSlide`. `HeroCarousel.tsx`: render secuencial de bloques con timer interno sincronizado al reloj del slide (§3) y transición (§4). 1 bloque = comportamiento actual.

Cada PR con **QA hermano** (QA-gate por PR). Deploy vía DEVOPS tras cada merge.

## 7. Criterios de aceptación (del Board)

- Desde admin: crear slide con vídeo 45 s + 3 bloques (7 s, 8 s, resto), cada uno con posición propia; en lacwake.es se ven rotar con efecto.
- Slides existentes (texto único) se ven **exactamente igual** que antes.
