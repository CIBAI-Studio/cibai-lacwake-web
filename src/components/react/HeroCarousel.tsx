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
import type { HeroRotation, HeroSlide } from '../../lib/cms';
import { resolveHeroFont } from '../../lib/heroFonts';

interface Props {
  slides: HeroSlide[];
  rotation: HeroRotation;
}

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

// ─── Bloque de texto (overline / título / subtítulo / CTAs) ───────────────────
function HeroText({
  slide,
  reduced,
  stagger,
}: {
  slide: HeroSlide;
  reduced: boolean;
  stagger: number;
}) {
  const hasOverline = typeof slide.overline === 'string' && slide.overline.trim() !== '';
  const primaryLabel = slide.ctaLabel || 'Reservar ahora';
  const secondaryLabel = slide.ctaSecondaryLabel || 'Ver actividades';

  const primary = (
    <a
      href={slide.ctaUrl}
      className="btn-reserve"
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${primaryLabel} — abre en nueva pestaña`}
    >
      {primaryLabel}
    </a>
  );
  const secondary = (
    <a href={slide.ctaSecondaryUrl} className="btn-secondary">
      {secondaryLabel}
    </a>
  );

  if (reduced) {
    return (
      <div className="hero-content">
        {hasOverline && <div className="hero-tag">{slide.overline}</div>}
        <h1 className="hero-title">{slide.title}</h1>
        <p className="hero-subtitle">{slide.subtitle}</p>
        <div className="hero-actions">
          {primary}
          {secondary}
        </div>
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
          {slide.overline}
        </motion.div>
      )}
      <motion.h1 className="hero-title" variants={childVariants}>
        {slide.title}
      </motion.h1>
      <motion.p className="hero-subtitle" variants={childVariants}>
        {slide.subtitle}
      </motion.p>
      <motion.div className="hero-actions" variants={childVariants}>
        {primary}
        {secondary}
      </motion.div>
    </motion.div>
  );
}

export default function HeroCarousel({ slides, rotation }: Props) {
  const reduced = useReducedMotion() ?? false;
  const isMulti = slides.length >= 2;

  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [soundVisible, setSoundVisible] = useState(false);
  // aria-live pasa a "polite" sólo tras interacción manual (evita spam en auto-rotación).
  const [liveMode, setLiveMode] = useState<'off' | 'polite'>('off');

  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const firstRenderRef = useRef(true);

  const activeSlide = slides[active] ?? slides[0];
  const activeIsVideo = activeSlide?.background.type === 'video';

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
    // contrato CIBA-2241, rango 1–30 s ya validado en cms.ts); si está ausente,
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
    const unmute = () => {
      const video = videoRefs.current[active];
      if (!video) return;
      if (video.muted) {
        video.muted = false;
        setSoundOn(true);
        const p = video.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      }
      ac.abort();
    };
    for (const ev of ['pointerdown', 'touchstart', 'keydown', 'scroll', 'wheel']) {
      document.addEventListener(ev, unmute, { once: true, passive: true, signal: ac.signal });
    }
    return () => ac.abort();
  }, [active, activeIsVideo, reduced, activeSlide]);

  // ─── Pausa en pestaña oculta (WCAG 2.2.2) ─────────────────────────────────────
  useEffect(() => {
    if (!isMulti) return;
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [isMulti]);

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
      onMouseEnter={isMulti ? onMouseEnter : undefined}
      onMouseLeave={isMulti ? onMouseLeave : undefined}
      onFocusCapture={isMulti ? onFocusCapture : undefined}
      onBlurCapture={isMulti ? onBlurCapture : undefined}
      onPointerDown={isMulti ? onPointerDown : undefined}
      onPointerMove={isMulti ? onPointerMove : undefined}
      onPointerUp={isMulti ? onPointerUp : undefined}
      onPointerCancel={isMulti ? onPointerCancel : undefined}
    >
      {/* ─── Capa de media (crossfade) ─── */}
      <div className="hero-media" aria-hidden="true">
        {slides.map((slide, i) => {
          const isActive = i === active;
          return (
            <div
              key={slide.id}
              className="hero-slide-media"
              data-active={isActive}
              style={{ transitionDuration: `${reduced ? 0 : rotation.transitionMs}ms` }}
            >
              {slide.background.type === 'video' ? (
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
                  poster={slide.background.fallbackImage || undefined}
                  preload={i === 0 ? slide.video.preload : 'none'}
                  autoPlay={i === 0}
                >
                  <source src={slide.background.videoUrl} type="video/mp4" />
                </video>
              ) : (
                <img
                  className="hero-slide-img"
                  src={slide.background.imageUrl || slide.background.fallbackImage}
                  alt=""
                  aria-hidden="true"
                  width={1920}
                  height={1080}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                />
              )}
            </div>
          );
        })}
        {/* Scrim/overlay único encima de la media (lake-950 para AA) */}
        <div className="hero-overlay" aria-hidden="true" />
      </div>

      {/* ─── Capa de contenido (texto por-slide) ─── */}
      <div
        className="hero-content-layer"
        data-h={activeSlide?.layout.h}
        data-v={activeSlide?.layout.v}
        aria-live={liveMode}
      >
        <div className="hero-content-wrapper">
          <AnimatePresence mode="wait" initial={false}>
            <div key={active} className="hero-slide-text" style={styleVarsByIndex[active]}>
              <HeroText slide={activeSlide} reduced={reduced} stagger={stagger} />
            </div>
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
