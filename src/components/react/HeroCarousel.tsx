/**
 * HeroCarousel — carrusel Hero multi-slide (CIBA-2217).
 *
 * Implementa la spec DESIGNER `carrusel-hero.md` (CIBA-2214) sobre el contrato
 * backend `slides[]` (CIBA-2215):
 *  - 1 slide  → Hero single-slide idéntico al actual (sin dots/flechas/autoplay).
 *  - 2–5 slides → carrusel: crossfade 800ms, re-reveal de texto con el spring
 *    existente (stiffness 80 / damping 18), dots (panel lake-950 α0.72, activo
 *    pill sun-500), flechas opt-in (default OFF, ≥1024px), auto-rotación
 *    6000ms img / 8000ms vídeo con pausa hover/focus-within/tab-hidden y
 *    respeto a prefers-reduced-motion.
 *
 * El fondo (vídeo/imagen) y la capa de texto son por-slide. El vídeo conserva
 * autoplay muted + preload:auto + auto-unmute al primer gesto (patrón CIBA-2201);
 * los vídeos inactivos se pausan para no consumir CPU/red.
 *
 * Bloques de texto rotatorios (CIBA-2453/2455): cada slide lleva `blocks[]`
 * (≥1, sintetizado por cms.ts si el CMS no lo envía). Con ≥2 bloques rotan
 * secuencialmente dentro del slide con fade+y (childVariants); el fondo
 * permanece. La posición (layout {h,v}) pasa a ser por-bloque. Semántica §3
 * del contrato: último bloque sin duration → hold hasta fin de slide;
 * intermedio sin duration → 6 s; el cambio de slide corta el ciclo y al
 * (re)entrar se reinicia en blocks[0].
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import type {
  HeroBlockViewStyles,
  HeroCtaVisibility,
  HeroRotation,
  HeroSlide,
  HeroTextBlock,
} from '../../lib/cms';
import { resolveHeroFont } from '../../lib/heroFonts';

interface Props {
  slides: HeroSlide[];
  rotation: HeroRotation;
}

/** Default de permanencia de un bloque intermedio sin `duration` (contrato §3). */
const HERO_BLOCK_DEFAULT_MS = 6000;

/** Breakpoint móvil del contrato CIBA-2559: <768px usa la media 9:16 si existe. */
const PORTRAIT_MEDIA_QUERY = '(max-width: 767px)';

// ─── Variantes de movimiento (conserva la firma del 'giro' aprobado) ──────────
const childVariants: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 80, damping: 18 },
  },
};

function containerVariants(stagger: number): Variants {
  return {
    hidden: {},
    visible: { transition: { staggerChildren: stagger, delayChildren: 0 } },
    exit: { opacity: 0, y: -16, transition: { duration: 0.25, ease: 'easeIn' } },
  };
}

// ─── CSS vars por slide (tipografía/color configurables) ──────────────────────
function slideStyleVars(slide: HeroSlide): CSSProperties {
  const t = slide.typography;
  const titleFont = resolveHeroFont(t.title.font, 'anton');
  const subtitleFont = resolveHeroFont(t.subtitle.font, 'inter');
  const buttonFont = resolveHeroFont(t.button.font, 'inter');

  const titleSize = `clamp(2.5rem, ${(t.title.size / 12).toFixed(2)}vw, ${t.title.size}px)`;
  const subtitleSize = `clamp(1rem, ${(t.subtitle.size / 16).toFixed(2)}vw, ${t.subtitle.size}px)`;

  return {
    '--hero-title-font': titleFont.family,
    '--hero-title-size': titleSize,
    '--hero-title-color': t.title.color,
    '--hero-title-accent': t.title.accentColor,
    '--hero-subtitle-font': subtitleFont.family,
    '--hero-subtitle-size': subtitleSize,
    '--hero-subtitle-color': t.subtitle.color,
    '--hero-btn-font': buttonFont.family,
    '--hero-btn-size': `${t.button.size}px`,
    '--hero-btn-text-color': t.button.textColor,
    '--hero-btn-bg': t.button.bgColor,
  } as CSSProperties;
}

// ─── CSS vars por bloque (overrides de tamaño/color por vista, CIBA-2593) ─────
// Sólo emite las vars definidas: sin overrides no hay vars y la cascada CSS
// (var(--hero-block-*) → var(--hero-*) → default del tema) queda como hoy.
// El corte desktop/móvil lo hace la media query de Hero.astro (mismo breakpoint
// portrait 9:16 que PORTRAIT_MEDIA_QUERY).
function blockStyleVars(block: HeroTextBlock | undefined): CSSProperties | undefined {
  const st = block?.styles;
  if (!st) return undefined;
  const vars: Record<string, string> = {};
  const set = (view: 'desktop' | 'mobile', v: HeroBlockViewStyles) => {
    if (v.titleSize !== undefined) vars[`--hero-block-title-size-${view}`] = `${v.titleSize}px`;
    if (v.subtitleSize !== undefined)
      vars[`--hero-block-subtitle-size-${view}`] = `${v.subtitleSize}px`;
    if (v.titleColor) vars[`--hero-block-title-color-${view}`] = v.titleColor;
    if (v.subtitleColor) vars[`--hero-block-subtitle-color-${view}`] = v.subtitleColor;
  };
  set('desktop', st.desktop);
  set('mobile', st.mobile);
  return vars as CSSProperties;
}

// ─── Visibilidad de un CTA por vista (CIBA-2593) ──────────────────────────────
// Pre-hidratación (viewport null) el CTA se pinta si es visible en ALGUNA vista
// y las clases hero-cta--hide-* lo ocultan por media query (display:none ⇒ fuera
// del tab-order y del árbol a11y). Con viewport resuelto, el toggle OFF elimina
// el nodo del DOM (requisito del contrato: no existe/no tabulable en esa vista).
function ctaRender(vis: HeroCtaVisibility, mobileViewport: boolean | null) {
  const show =
    mobileViewport === null
      ? vis.showDesktop || vis.showMobile
      : mobileViewport
        ? vis.showMobile
        : vis.showDesktop;
  const hideClass = [
    !vis.showDesktop ? 'hero-cta--hide-desktop' : '',
    !vis.showMobile ? 'hero-cta--hide-mobile' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return { show, hideClass };
}

// ─── Bloque de texto (overline / título / subtítulo / CTAs) ───────────────────
function HeroText({
  block,
  reduced,
  stagger,
  mobileViewport,
}: {
  block: HeroTextBlock;
  reduced: boolean;
  stagger: number;
  mobileViewport: boolean | null;
}) {
  const hasOverline = typeof block.overline === 'string' && block.overline.trim() !== '';
  const primaryLabel = block.ctaLabel || 'Reservar ahora';
  const secondaryLabel = block.ctaSecondaryLabel || 'Ver actividades';

  const primaryVis = ctaRender(block.buttons.ctaPrimary, mobileViewport);
  const secondaryVis = ctaRender(block.buttons.ctaSecondary, mobileViewport);
  const hasActions = primaryVis.show || secondaryVis.show;

  const primary = primaryVis.show && (
    <a
      href={block.ctaUrl}
      className={`btn-reserve${primaryVis.hideClass ? ` ${primaryVis.hideClass}` : ''}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${primaryLabel} — abre en nueva pestaña`}
    >
      {primaryLabel}
    </a>
  );
  const secondary = secondaryVis.show && (
    <a
      href={block.ctaSecondaryUrl}
      className={`btn-secondary${secondaryVis.hideClass ? ` ${secondaryVis.hideClass}` : ''}`}
    >
      {secondaryLabel}
    </a>
  );

  if (reduced) {
    return (
      <div className="hero-content">
        {hasOverline && <div className="hero-tag">{block.overline}</div>}
        <h1 className="hero-title">{block.title}</h1>
        <p className="hero-subtitle">{block.subtitle}</p>
        {hasActions && (
          <div className="hero-actions">
            {primary}
            {secondary}
          </div>
        )}
      </div>
    );
  }

  return (
    <motion.div
      className="hero-content"
      variants={containerVariants(stagger)}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {hasOverline && (
        <motion.div className="hero-tag" variants={childVariants}>
          {block.overline}
        </motion.div>
      )}
      <motion.h1 className="hero-title" variants={childVariants}>
        {block.title}
      </motion.h1>
      <motion.p className="hero-subtitle" variants={childVariants}>
        {block.subtitle}
      </motion.p>
      {hasActions && (
        <motion.div className="hero-actions" variants={childVariants}>
          {primary}
          {secondary}
        </motion.div>
      )}
    </motion.div>
  );
}

export default function HeroCarousel({ slides, rotation }: Props) {
  const reduced = useReducedMotion() ?? false;
  const isMulti = slides.length >= 2;

  const [active, setActive] = useState(0);
  // Cursor del ciclo de bloques: lleva el slide al que pertenece para que el
  // reset al (re)entrar a un slide sea síncrono con el cambio de `active`
  // (sin frame intermedio mostrando el bloque del slide anterior).
  const [blockCursor, setBlockCursor] = useState({ slide: 0, idx: 0 });
  const [paused, setPaused] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [soundVisible, setSoundVisible] = useState(false);
  // aria-live pasa a "polite" sólo tras interacción manual (evita spam en auto-rotación).
  const [liveMode, setLiveMode] = useState<'off' | 'polite'>('off');

  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const firstRenderRef = useRef(true);

  // ─── Media 9:16 móvil (CIBA-2559) ───────────────────────────────────────────
  // `<source media>` no existe dentro de <video>: la variante se decide en
  // cliente con matchMedia ANTES de asignar src, para no descargar dos vídeos.
  // Sin variante portrait en el CMS este estado ni se activa y el markup SSR
  // es idéntico al actual (desktop y móvil sin cambios de red).
  const hasPortraitVideo = useMemo(
    () => slides.some((s) => s.background.type === 'video' && s.background.videoUrlPortrait),
    [slides],
  );
  // null = aún sin resolver (SSR / pre-hidratación).
  const [portraitViewport, setPortraitViewport] = useState<boolean | null>(null);
  useEffect(() => {
    if (!hasPortraitVideo) return;
    const mq = window.matchMedia(PORTRAIT_MEDIA_QUERY);
    const update = () => setPortraitViewport(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [hasPortraitVideo]);

  // Al resolverse (o cambiar) la variante, recargar sólo los vídeos con
  // variante portrait y reanudar el activo. El guard evita recargas al
  // navegar entre slides (`active` está en deps sólo para reanudar el correcto).
  const appliedPortraitRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (portraitViewport === null || appliedPortraitRef.current === portraitViewport) return;
    appliedPortraitRef.current = portraitViewport;
    videoRefs.current.forEach((video, i) => {
      const bg = slides[i]?.background;
      if (!video || !bg || bg.type !== 'video' || !bg.videoUrlPortrait) return;
      video.load();
      if (i === active) {
        video.muted = true;
        const p = video.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      }
    });
  }, [portraitViewport, slides, active]);

  // ─── Viewport móvil para toggles de CTA (CIBA-2593) ─────────────────────────
  // Mismo breakpoint que la variante portrait 9:16 (PORTRAIT_MEDIA_QUERY,
  // CIBA-2558). Sólo se escucha si algún bloque tiene un toggle en OFF: con el
  // contenido actual de producción no hay listener ni re-render extra.
  const hasCtaToggles = useMemo(
    () =>
      slides.some((s) =>
        s.blocks.some(
          (b) =>
            !b.buttons.ctaPrimary.showDesktop ||
            !b.buttons.ctaPrimary.showMobile ||
            !b.buttons.ctaSecondary.showDesktop ||
            !b.buttons.ctaSecondary.showMobile,
        ),
      ),
    [slides],
  );
  const [mobileViewport, setMobileViewport] = useState<boolean | null>(null);
  useEffect(() => {
    if (!hasCtaToggles) return;
    const mq = window.matchMedia(PORTRAIT_MEDIA_QUERY);
    const update = () => setMobileViewport(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [hasCtaToggles]);

  const activeSlide = slides[active] ?? slides[0];
  const activeIsVideo = activeSlide?.background.type === 'video';

  // Bloques del slide activo (cms.ts garantiza ≥1). El cursor sólo vale para
  // el slide al que pertenece; en cualquier otro caso el ciclo está en 0.
  const blocks = activeSlide?.blocks ?? [];
  const blockCount = blocks.length;
  const blockIdx = Math.min(
    blockCursor.slide === active ? blockCursor.idx : 0,
    Math.max(0, blockCount - 1),
  );
  const activeBlock = blocks[blockIdx];
  const hasBlockRotation = useMemo(
    () => slides.some((s) => (s.blocks?.length ?? 0) >= 2),
    [slides],
  );

  const styleVarsByIndex = useMemo(() => slides.map(slideStyleVars), [slides]);

  // Stagger: carga inicial 0.1 (=[0,.1,.2,.3]); cambio de slide 0.06 (ritmo ágil).
  const stagger = firstRenderRef.current ? 0.1 : 0.06;

  // ─── Navegación ─────────────────────────────────────────────────────────────
  const goTo = useCallback(
    (index: number, manual: boolean) => {
      if (slides.length === 0) return;
      let next = index;
      if (rotation.loop) {
        next = ((index % slides.length) + slides.length) % slides.length;
      } else {
        next = Math.max(0, Math.min(slides.length - 1, index));
      }
      if (manual) setLiveMode('polite');
      setActive(next);
      // Cambio de slide corta el ciclo de bloques y reinicia en blocks[0] (§3).
      setBlockCursor({ slide: next, idx: 0 });
    },
    [slides.length, rotation.loop],
  );

  const next = useCallback((manual = false) => goTo(active + 1, manual), [active, goTo]);
  const prev = useCallback((manual = false) => goTo(active - 1, manual), [active, goTo]);

  // ─── Auto-rotación (§5): pausa hover/focus-within/tab-hidden + reduced-motion ─
  useEffect(() => {
    firstRenderRef.current = false;
    if (reduced || !rotation.autoplay || !isMulti || paused) return;

    // Duración de permanencia del slide activo: prioriza `slide.duration` (s → ms,
    // contrato CIBA-2241, rango 1–60 s ya validado en cms.ts); si está ausente,
    // hereda el intervalo global del hero (vídeo/imagen). Cada avance reprograma
    // este efecto (dep `active`), por lo que el temporizador es por-slide, no fijo.
    const globalMs = activeIsVideo ? rotation.videoIntervalMs : rotation.intervalMs;
    const intervalMs = activeSlide?.duration ? activeSlide.duration * 1000 : globalMs;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const start = () => {
      timer = setTimeout(() => goTo(active + 1, false), intervalMs);
    };

    // Vídeo: arranca el cronómetro en canplay (no espera 'ended'). Imagen: ya.
    const video = videoRefs.current[active];
    if (activeIsVideo && video && video.readyState < 3) {
      const onReady = () => start();
      video.addEventListener('canplay', onReady, { once: true });
      // Salvaguarda si canplay no dispara (vídeo cacheado/erróneo).
      timer = setTimeout(() => goTo(active + 1, false), intervalMs + 1500);
      return () => {
        video.removeEventListener('canplay', onReady);
        if (timer) clearTimeout(timer);
      };
    }

    start();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [active, activeSlide, paused, reduced, isMulti, activeIsVideo, rotation, goTo]);

  // ─── Rotación de bloques dentro del slide (contrato CIBA-2453 §3) ────────────
  // El último bloque nunca arranca timer de salida → hold hasta el cambio de
  // slide (cubre Σ<slide); si Σ≥slide, el cambio de slide corta el ciclo vía
  // goTo. Comparte las señales de pausa de la rotación de slides (hover /
  // focus-within / tab-hidden — WCAG 2.2.2). Bajo prefers-reduced-motion la
  // rotación continúa pero el swap es instantáneo (§4): los bloques son
  // contenido, no decoración — a diferencia del autoplay de slides, ocultarlos
  // dejaría texto inaccesible sin control manual equivalente a los dots.
  useEffect(() => {
    if (paused || blockCount < 2 || blockIdx >= blockCount - 1) return;
    const duration = blocks[blockIdx]?.duration;
    const ms = duration ? duration * 1000 : HERO_BLOCK_DEFAULT_MS;
    const timer = setTimeout(() => {
      setBlockCursor({ slide: active, idx: Math.min(blockIdx + 1, blockCount - 1) });
    }, ms);
    return () => clearTimeout(timer);
  }, [active, blockIdx, blocks, blockCount, paused]);

  // ─── Gestión de vídeo por-slide: reproducir activo, pausar inactivos ──────────
  useEffect(() => {
    // Reset de sonido al cambiar de slide (§5.4): evita audio fantasma.
    setSoundOn(false);

    videoRefs.current.forEach((video, i) => {
      if (!video) return;
      if (i === active) {
        video.muted = true;
        const p = video.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } else {
        video.pause();
        video.muted = true;
      }
    });
  }, [active]);

  // Mostrar el control de sonido sólo si el slide activo es vídeo reproducible.
  useEffect(() => {
    setSoundVisible(false);
    if (!activeIsVideo) return;
    const video = videoRefs.current[active];
    if (!video) return;

    const show = () => setSoundVisible(true);
    if (video.readyState >= 2) show();
    else video.addEventListener('canplay', show, { once: true });

    const onError = () => setSoundVisible(false);
    video.addEventListener('error', onError);
    return () => {
      video.removeEventListener('canplay', show);
      video.removeEventListener('error', onError);
    };
  }, [active, activeIsVideo]);

  // ─── Auto-unmute al primer gesto (sound_intent = on) — patrón CIBA-2201 ───────
  useEffect(() => {
    if (reduced || !activeIsVideo) return;
    if (activeSlide?.video.soundIntent !== 'on') return;

    const ac = new AbortController();
    let settled = false;
    // Sólo gestos de activación de usuario válidos para la política de autoplay-con-audio.
    // scroll/wheel NO son user-activation válidos (Chrome/Safari): activarían el unmute
    // sin que el navegador permita el audio y, con { once }, quemarían el intento para siempre.
    const unmute = () => {
      if (settled) return;
      const video = videoRefs.current[active];
      if (!video || !video.muted) return; // sin vídeo o ya en proceso
      video.muted = false;
      const finish = () => {
        if (!video.muted && !video.paused) {
          settled = true;
          setSoundOn(true);
          ac.abort(); // el audio arrancó de verdad → consumir listeners
        } else {
          video.muted = true; // no prendió → re-mutear y esperar el siguiente gesto válido
        }
      };
      const p = video.play();
      if (p && typeof p.then === 'function') p.then(finish).catch(() => { video.muted = true; });
      else finish();
    };
    // No usamos { once: true }: mantenemos los listeners hasta confirmar que el audio arrancó.
    for (const ev of ['pointerdown', 'touchstart', 'keydown', 'click']) {
      document.addEventListener(ev, unmute, { passive: true, signal: ac.signal });
    }
    return () => ac.abort();
  }, [active, activeIsVideo, reduced, activeSlide]);

  // Hay contenido auto-rotante (slides o bloques) → aplican las pausas WCAG.
  const hasAutoRotation = isMulti || hasBlockRotation;

  // ─── Pausa en pestaña oculta (WCAG 2.2.2) ─────────────────────────────────────
  useEffect(() => {
    if (!hasAutoRotation) return;
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [hasAutoRotation]);

  // ─── Control de sonido del vídeo activo ───────────────────────────────────────
  const toggleSound = useCallback(() => {
    const video = videoRefs.current[active];
    if (!video) return;
    const nextOn = video.muted; // estaba muted → activar
    video.muted = !nextOn;
    setSoundOn(nextOn);
    const p = video.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  }, [active]);

  // ─── Teclado en el tablist de dots (←/→/Home/End) ─────────────────────────────
  const onDotsKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          next(true);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          prev(true);
          break;
        case 'Home':
          e.preventDefault();
          goTo(0, true);
          break;
        case 'End':
          e.preventDefault();
          goTo(slides.length - 1, true);
          break;
        default:
          break;
      }
    },
    [next, prev, goTo, slides.length],
  );

  // Pausa por foco dentro del hero (teclado): focus-within vía React.
  const onFocusCapture = useCallback(() => setPaused(true), []);
  const onBlurCapture = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setPaused(false);
  }, []);
  const onMouseEnter = useCallback(() => setPaused(true), []);
  const onMouseLeave = useCallback(() => setPaused(false), []);

  // ─── Swipe táctil (§3.1): umbral 50px o flick ≥0.3px/ms, guardia de eje,
  // snap-back en pointercancel. Aditivo: dots/teclado cubren no-táctil. ─────────
  const swipe = useRef<{ x: number; y: number; t: number; axis: 'h' | 'v' | null } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // El swipe es la navegación primaria en touch/pen; el ratón usa dots/flechas.
      if (!isMulti || e.pointerType === 'mouse') return;
      swipe.current = { x: e.clientX, y: e.clientY, t: e.timeStamp, axis: null };
    },
    [isMulti],
  );

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const s = swipe.current;
    if (!s) return;
    if (s.axis === null) {
      const dx = Math.abs(e.clientX - s.x);
      const dy = Math.abs(e.clientY - s.y);
      // Guardia de eje: sólo bloquear como horizontal si domina Δx (evita secuestrar scroll).
      if (dx + dy > 10) s.axis = dx > dy * 1.2 ? 'h' : 'v';
    }
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const s = swipe.current;
      swipe.current = null;
      if (!s || s.axis !== 'h') return;
      const dx = e.clientX - s.x;
      const dt = Math.max(1, e.timeStamp - s.t);
      const velocity = Math.abs(dx) / dt; // px/ms
      if (Math.abs(dx) >= 50 || velocity >= 0.3) {
        if (dx < 0) next(true);
        else prev(true);
      }
      // Por debajo del umbral → snap-back implícito (crossfade por opacidad, no drag-follow).
    },
    [next, prev],
  );

  const onPointerCancel = useCallback(() => {
    swipe.current = null;
  }, []);

  return (
    <div
      className="hero-carousel"
      style={isMulti ? { touchAction: 'pan-y' } : undefined}
      onMouseEnter={hasAutoRotation ? onMouseEnter : undefined}
      onMouseLeave={hasAutoRotation ? onMouseLeave : undefined}
      onFocusCapture={hasAutoRotation ? onFocusCapture : undefined}
      onBlurCapture={hasAutoRotation ? onBlurCapture : undefined}
      onPointerDown={isMulti ? onPointerDown : undefined}
      onPointerMove={isMulti ? onPointerMove : undefined}
      onPointerUp={isMulti ? onPointerUp : undefined}
      onPointerCancel={isMulti ? onPointerCancel : undefined}
    >
      {/* ─── Capa de media (crossfade) ─── */}
      <div className="hero-media" aria-hidden="true">
        {slides.map((slide, i) => {
          const isActive = i === active;
          const bg = slide.background;
          // Variante 9:16 (CIBA-2559), fallback POR CAMPO independiente:
          // vídeo portrait ausente → vídeo 16:9; imagen portrait ausente → 16:9.
          const slideHasPortraitVideo = bg.type === 'video' && Boolean(bg.videoUrlPortrait);
          // Con variante portrait el src se decide en cliente: hasta resolver el
          // viewport NO se emite <source> (evita la doble descarga; el src SSR
          // sólo existe cuando no hay variante y por tanto no hay elección).
          const videoSrc = slideHasPortraitVideo
            ? portraitViewport === null
              ? undefined
              : portraitViewport
                ? bg.videoUrlPortrait
                : bg.videoUrl
            : bg.videoUrl;
          const poster =
            (portraitViewport ? bg.fallbackImagePortrait : undefined) ||
            bg.fallbackImage ||
            undefined;
          const image = (
            <img
              className="hero-slide-img"
              src={bg.imageUrl || bg.fallbackImage}
              alt=""
              aria-hidden="true"
              width={1920}
              height={1080}
              loading={i === 0 ? 'eager' : 'lazy'}
              decoding="async"
            />
          );
          return (
            <div
              key={slide.id}
              className="hero-slide-media"
              data-active={isActive}
              style={{ transitionDuration: `${reduced ? 0 : rotation.transitionMs}ms` }}
            >
              {bg.type === 'video' ? (
                // El `poster` ES la imagen fallback: el navegador la muestra hasta
                // que el vídeo pinta su primer frame, y la conserva si el vídeo
                // falla al cargar. NO añadir un <img> superpuesto encima del
                // <video> — tapaba el vídeo (audio audible, imagen fija) — bug P-alta
                // CIBA-2325.
                <video
                  ref={(el) => {
                    videoRefs.current[i] = el;
                  }}
                  className="hero-video"
                  muted
                  loop={slide.video.loop}
                  playsInline
                  poster={poster}
                  preload={
                    slideHasPortraitVideo && portraitViewport === null
                      ? 'none'
                      : i === 0
                        ? slide.video.preload
                        : 'none'
                  }
                  autoPlay={i === 0}
                >
                  {videoSrc && <source src={videoSrc} type="video/mp4" />}
                </video>
              ) : bg.fallbackImagePortrait ? (
                // Para imagen sí vale <picture>: el navegador elige la fuente
                // 9:16 en <768px sin JS ni doble descarga.
                <picture>
                  <source media={PORTRAIT_MEDIA_QUERY} srcSet={bg.fallbackImagePortrait} />
                  {image}
                </picture>
              ) : (
                image
              )}
            </div>
          );
        })}
        {/* Scrim/overlay único encima de la media (lake-950 para AA) */}
        <div className="hero-overlay" aria-hidden="true" />
      </div>

      {/* ─── Capa de contenido (texto por-bloque; posición por-bloque §1) ─── */}
      <div
        className="hero-content-layer"
        data-h={activeBlock?.layout.h ?? activeSlide?.layout.h}
        data-v={activeBlock?.layout.v ?? activeSlide?.layout.v}
        aria-live={liveMode}
      >
        <div className="hero-content-wrapper">
          <AnimatePresence mode="wait" initial={false}>
            {activeBlock && (
              <div
                key={`${active}:${blockIdx}`}
                className="hero-slide-text"
                style={{ ...styleVarsByIndex[active], ...blockStyleVars(activeBlock) }}
              >
                <HeroText
                  block={activeBlock}
                  reduced={reduced}
                  stagger={stagger}
                  mobileViewport={mobileViewport}
                />
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ─── Control de sonido (vídeo del slide activo) ─── */}
      {activeIsVideo && (
        <button
          type="button"
          className="hero-sound"
          hidden={!soundVisible}
          aria-pressed={soundOn}
          aria-label={soundOn ? 'Silenciar vídeo' : 'Activar sonido del vídeo'}
          onClick={toggleSound}
        >
          <svg
            className="hero-sound-icon hero-sound-icon--muted"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            width="22"
            height="22"
          >
            <path d="M11 5 6 9H2v6h4l5 4V5Z" fill="currentColor" />
            <path d="m16 9 5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <svg
            className="hero-sound-icon hero-sound-icon--on"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            width="22"
            height="22"
          >
            <path d="M11 5 6 9H2v6h4l5 4V5Z" fill="currentColor" />
            <path
              d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span className="hero-sound-label">{soundOn ? 'Silenciar' : 'Activar sonido'}</span>
        </button>
      )}

      {/* ─── Flechas prev/next (opt-in, default OFF, ≥1024px por CSS) ─── */}
      {isMulti && rotation.showArrows && (
        <>
          <button
            type="button"
            className="hero-arrow hero-arrow--prev"
            aria-label="Diapositiva anterior"
            onClick={() => prev(true)}
          >
            <svg viewBox="0 0 24 24" fill="none" width="20" height="20" aria-hidden="true">
              <path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            className="hero-arrow hero-arrow--next"
            aria-label="Diapositiva siguiente"
            onClick={() => next(true)}
          >
            <svg viewBox="0 0 24 24" fill="none" width="20" height="20" aria-hidden="true">
              <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </>
      )}

      {/* ─── Dots (≥2 slides) ─── */}
      {isMulti && (
        <div
          className="hero-dots"
          role="tablist"
          aria-label="Selector de diapositiva"
          onKeyDown={onDotsKeyDown}
        >
          {slides.map((slide, i) => {
            const isActive = i === active;
            return (
              <button
                key={slide.id}
                type="button"
                role="tab"
                className="hero-dot"
                data-active={isActive}
                aria-selected={isActive}
                aria-current={isActive ? 'true' : undefined}
                aria-label={`Ir a la diapositiva ${i + 1} de ${slides.length}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => goTo(i, true)}
              >
                <span className="hero-dot-shape" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      )}

      {/* ─── Scroll indicator: sólo Hero single-slide (sin regresión) ─── */}
      {!isMulti && (
        <div className="hero-scroll" aria-hidden="true">
          <div className="scroll-line" />
        </div>
      )}
    </div>
  );
}
