/**
 * CMS data-fetching layer with in-memory cache (TTL 10 s) and graceful fallback.
 * Connects to CMS_API_URL env var; uses hardcoded defaults when API is unavailable.
 */

const CMS_API_URL = import.meta.env.CMS_API_URL ?? '';
// TTL corto: la home es SSR y lee el CMS en vivo. Guardar en admin actualiza el CMS
// al instante; con 10 s el SSR refleja el cambio en ≤10 s sin martillar la API (CIBA-2363).
const CACHE_TTL_MS = 10 * 1000;

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function fromCache<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry || Date.now() > entry.expiresAt) return null;
  return entry.data;
}

function toCache<T>(key: string, data: T): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

async function fetchCMS<T>(path: string, fallback: T): Promise<T> {
  const key = path;
  const cached = fromCache<T>(key);
  if (cached !== null) return cached;

  if (!CMS_API_URL) return fallback;

  try {
    const res = await fetch(`${CMS_API_URL}${path}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return fallback;
    const data: T = await res.json();
    toCache(key, data);
    return data;
  } catch {
    return fallback;
  }
}

// The CMS API wraps section content under a `content` key:
// { section_key, locale, content: { ...fields }, updated_at }
// This helper fetches a section and returns only the inner `content` object.
type CmsRow = { content: Record<string, unknown> };

async function fetchSection(path: string): Promise<Record<string, unknown> | null> {
  const raw = await fetchCMS<CmsRow | null>(path, null);
  return raw?.content ?? null;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type HeroHAlign = 'left' | 'center' | 'right';
export type HeroVAlign = 'top' | 'center' | 'bottom';

export interface HeroTitleTypo {
  font: string;
  size: number;
  color: string;
  accentColor: string;
}
export interface HeroSubtitleTypo {
  font: string;
  size: number;
  color: string;
}
export interface HeroButtonTypo {
  font: string;
  size: number;
  textColor: string;
  bgColor: string;
}

export interface HeroContent {
  title: string;
  subtitle: string;
  videoUrl: string;
  fallbackImage: string;
  /** Variante vertical 9:16 para móvil (CIBA-2558/2559). Ausente ⇒ se usa el 16:9. */
  videoUrlPortrait?: string;
  /** Imagen 9:16 para móvil. Fallback POR CAMPO: ausente ⇒ `fallbackImage`. */
  fallbackImagePortrait?: string;
  ctaLabel: string;
  ctaUrl: string;
  ctaSecondaryLabel: string;
  ctaSecondaryUrl: string;
  // ─── Configurables (CIBA-2201) — todos opcionales en el CMS, con defaults ───
  overline: string;
  layout: { h: HeroHAlign; v: HeroVAlign };
  typography: {
    title: HeroTitleTypo;
    subtitle: HeroSubtitleTypo;
    button: HeroButtonTypo;
  };
  video: {
    preload: 'auto' | 'metadata' | 'none';
    loop: boolean;
    soundIntent: 'on' | 'off';
  };
}

// ─── Hero carrusel multi-slide (CIBA-2217 / contrato CIBA-2215) ───────────────

export type HeroBackgroundType = 'image' | 'video';

export interface HeroSlideBackground {
  type: HeroBackgroundType;
  /** Sólo cuando type=video */
  videoUrl: string;
  /** Póster del vídeo (opcional). También es el fallback visible. */
  fallbackImage: string;
  /** Sólo cuando type=image */
  imageUrl: string;
  /** Vídeo 9:16 para viewport móvil (<768px). Ausente ⇒ `videoUrl` (CIBA-2559). */
  videoUrlPortrait?: string;
  /** Imagen/póster 9:16 para viewport móvil. Ausente ⇒ `fallbackImage`. */
  fallbackImagePortrait?: string;
}

/**
 * Bloque de texto rotatorio dentro de un slide (contrato CIBA-2453 §1).
 * Comparte los campos de texto del slide plano, pero con posición y duración
 * propias. La tipografía y el vídeo siguen siendo por-slide.
 */
export interface HeroTextBlock {
  id: string;
  overline: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaUrl: string;
  ctaSecondaryLabel: string;
  ctaSecondaryUrl: string;
  /** Posición POR BLOQUE (antes era por-slide). Default: layout del slide. */
  layout: { h: HeroHAlign; v: HeroVAlign };
  /**
   * Segundos que el bloque permanece visible (1–60). Opcional (§3): sin
   * duration, el último bloque hace hold hasta el fin del slide y uno
   * intermedio usa el default de 6 s.
   */
  duration?: number;
}

/** Slide resuelto y saneado, listo para render. Extiende la capa de texto del Hero. */
export interface HeroSlide {
  id: string;
  active: boolean;
  order: number;
  background: HeroSlideBackground;
  overline: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaUrl: string;
  ctaSecondaryLabel: string;
  ctaSecondaryUrl: string;
  layout: { h: HeroHAlign; v: HeroVAlign };
  typography: {
    title: HeroTitleTypo;
    subtitle: HeroSubtitleTypo;
    button: HeroButtonTypo;
  };
  video: {
    preload: 'auto' | 'metadata' | 'none';
    loop: boolean;
    soundIntent: 'on' | 'off';
  };
  /**
   * Duración de permanencia del slide en segundos (1–60). Opcional y aditivo:
   * si está ausente o fuera de rango, el carrusel hereda `rotation.intervalMs`.
   */
  duration?: number;
  /**
   * Bloques de texto que rotan secuencialmente dentro del slide (contrato
   * CIBA-2453 §2–3). Siempre ≥1: si el CMS no envía `blocks[]`, el parser
   * sintetiza un bloque único desde los campos planos → render idéntico al
   * comportamiento actual.
   */
  blocks: HeroTextBlock[];
}

export type HeroTransition = 'fade' | 'slide' | 'none';

/** Config de rotación del carrusel (spec DESIGNER CIBA-2214 §5 + contrato §7). */
export interface HeroRotation {
  /** Auto-rotación activa. Sólo surte efecto con ≥2 slides. */
  autoplay: boolean;
  /** Intervalo base por slide de imagen (ms). */
  intervalMs: number;
  /** Intervalo por slide de vídeo (ms). */
  videoIntervalMs: number;
  /** Tipo de transición del contrato backend. */
  transition: HeroTransition;
  /** Duración del crossfade de media (ms). */
  transitionMs: number;
  /** Flechas prev/next (opt-in, sólo ≥1024px). Default OFF. */
  showArrows: boolean;
  /** Rotación circular. */
  loop: boolean;
}

export interface HeroCarousel {
  slides: HeroSlide[];
  rotation: HeroRotation;
}

export interface WhyContent {
  label: string;
  title: string;
  body1: string;
  body2: string;
  ctaLabel: string;
  features: Array<{ icon: string; title: string; desc: string }>;
}

export interface CtaContent {
  title: string;
  body: string;
  primaryLabel: string;
  secondaryLabel: string;
  secondaryUrl: string;
}

export interface ActivityContent {
  title: string;
  description: string;
  tag?: string;
  duration?: string;
  minAge?: string;
  price?: string;
  included?: string[];
  body: string;
  /** Imagen inferior de la página de actividad, editable desde el admin (CIBA-2396). */
  image?: string;
  imageAlt?: string;
}

/**
 * Card de actividad pilotable desde la key `home` del CMS (contrato CIBA-2343).
 * Es un *override* opcional por-card: sólo se aplican los campos no vacíos sobre
 * el catálogo semilla (`ACTIVITY_FAMILIES`). Sin CMS, la home se ve idéntica.
 */
export interface HomeActivity {
  /** Identificador que casa con `Activity.slug` del catálogo. */
  id: string;
  family?: string;
  title?: string;
  blurb?: string;
  tag?: string;
  image?: string;
  imageAlt?: string;
  /** Enlace interno de la card (`/actividades/*`). */
  pageHref?: string;
  ctaType?: string;
  ctaLabel?: string;
  /** Mensaje WhatsApp personalizado por card (opcional). */
  ctaWhatsappMessage?: string;
}

export interface HomeContent {
  activities: HomeActivity[];
}

export interface ContactContent {
  title: string;
  lead: string;
}

export interface LegalContent {
  title: string;
  body: string;
  lastUpdated: string;
}

export interface MenuItem {
  label: string;
  href: string;
}

/** Enlace de navegación del footer (columnas Actividades / Legal). */
export interface FooterNavItem {
  label: string;
  href: string;
}

/** Marca del footer editable desde el CMS (key `footer`, CIBA-2388 / punto 5 CIBA-2376). */
export interface FooterContent {
  /** URL de imagen de logo. Vacío ⇒ se renderiza `logoText`. */
  logoImage: string;
  logoText: string;
  logoHref: string;
  /** Párrafo del brand. Soporta `\n` — el Footer preserva los saltos (CIBA-2402). */
  tagline: string;
  /** Línea de copyright. El placeholder `{year}` se expande al año actual. */
  copyright: string;
  navActividades: FooterNavItem[];
  navLegal: FooterNavItem[];
}

export interface SiteConfig {
  whatsappUrl: string;
  whatsappLabel: string;
  whatsappLabelShort: string;
  phone: string;
  phoneUrl: string;
  email: string;
  emailUrl: string;
  address: string;
  schedule: string;
}

/**
 * Divisores de sección configurables (contrato `home.dividers`, CIBA-2346).
 * Un `style` + `color` globales y la lista `between` de fronteras activas.
 */
export type DividerStyle = 'wave' | 'slant' | 'image' | 'none';
export type DividerBoundary = 'hero-activities' | 'activities-why' | 'why-cta' | 'footer';

export interface HomeDividers {
  /** Forma del divisor. `none` = frontera plana (sin divisor). */
  style: DividerStyle;
  /** Ruta al SVG cuando `style==='image'` (assets en `/assets/dividers/`). */
  asset: string;
  /**
   * Override global del color de relleno. Vacío = derivar por frontera el color
   * de la sección entrante (por defecto, coherente por bloque).
   */
  color: string;
  /** Fronteras donde se pinta divisor. */
  between: DividerBoundary[];
}

// ─── Fallbacks ───────────────────────────────────────────────────────────────

const FALLBACK_MENU: MenuItem[] = [
  { label: 'Inicio', href: '/' },
  { label: 'Actividades', href: '/#actividades' },
  { label: 'Contactar', href: '/contactar' },
];

const FALLBACK_SITE_CONFIG: SiteConfig = {
  whatsappUrl: 'https://wa.me/34676881982?text=Hola%2C%20quiero%20reservar%20una%20actividad%20en%20Lacwake',
  whatsappLabel: 'Reservar ahora',
  whatsappLabelShort: 'Reservar',
  phone: '+34 676 88 19 82',
  phoneUrl: 'tel:+34676881982',
  email: 'info@lacwake.es',
  emailUrl: 'mailto:info@lacwake.es',
  address: 'Embalse de la Baells — Cercs (Berguedà, Barcelona)',
  schedule: 'Todos los días 10:00 – 20:00 (temporada)',
};

const FALLBACK_HERO: HeroContent = {
  title: 'Tu aventura empieza en el agua',
  subtitle: 'Kayak, wake, esquí náutico y paseos en el embalse de la Baells. El pantano te espera.',
  // Assets rediseño (CIBA-2172): vídeo hero cinematográfico + poster coherente.
  // El Board puede sobrescribir video_url desde admin.lacwake.es; esto es el fallback local.
  videoUrl: '/assets/redesign/hero-baells.mp4',
  fallbackImage: '/assets/redesign/wakeboard.webp',
  ctaLabel: 'Reservar ahora',
  ctaUrl: FALLBACK_SITE_CONFIG.whatsappUrl,
  ctaSecondaryLabel: 'Ver actividades',
  ctaSecondaryUrl: '/#actividades',
  // Estado inicial exigido por el cliente (CIBA-2197 §1): abajo-izquierda,
  // fuente display de referencia (set interino: Anton) y sonido activo.
  overline: 'Actividades acuáticas',
  layout: { h: 'left', v: 'bottom' },
  typography: {
    title: { font: 'anton', size: 76, color: '#FFFFFF', accentColor: '#f59e0b' },
    subtitle: { font: 'inter', size: 20, color: '#E2E8F0' },
    button: { font: 'inter', size: 16, textColor: '#0B1120', bgColor: '#f59e0b' },
  },
  video: { preload: 'auto', loop: true, soundIntent: 'on' },
};

// ─── Validadores defensivos (el Backend valida, la web es resiliente) ─────────
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
function vHex(v: unknown, fb: string): string {
  return typeof v === 'string' && HEX_RE.test(v.trim()) ? v.trim() : fb;
}
function vNum(v: unknown, fb: number, min: number, max: number): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fb;
}
function vEnum<T extends string>(v: unknown, allowed: readonly T[], fb: T): T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fb;
}
function vStr(v: unknown, fb: string): string {
  return typeof v === 'string' && v.trim() !== '' ? v : fb;
}
/** String vacío o solo espacios → undefined, para que `??` caiga al siguiente candidato. */
function nonEmpty(v: string | undefined): string | undefined {
  return v && v.trim() !== '' ? v : undefined;
}

/**
 * Como `nonEmpty` pero para cuerpos HTML del admin: un TipTap "vacío" guarda
 * `<p></p>` (o variantes con &nbsp;), que no es texto real. Sin este guard, la
 * ficha vaciada desde el admin renderizaría un cuerpo en blanco en vez de caer
 * a la semilla (mismo espíritu que CIBA-2403).
 */
function nonEmptyHtml(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const hasMedia = /<(img|iframe|video|audio)\b/i.test(v);
  const text = v.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim();
  return hasMedia || text !== '' ? v : undefined;
}

const FALLBACK_WHY: WhyContent = {
  label: 'Nuestra propuesta',
  title: 'Naturaleza, agua y aventura al alcance de todos',
  body1: 'Lacwake nace de la pasión por el agua y la montaña. Nuestro pantano es un paraíso escondido donde el tiempo se detiene: aguas cristalinas, fauna local y paisajes que quitan el aliento.',
  body2: 'Cada actividad está diseñada para que disfrutes al máximo sin importar tu nivel de experiencia. Nuestro equipo te guía y acompaña en todo momento.',
  ctaLabel: 'Reservar ahora',
  features: [
    { icon: '💧', title: 'Entorno natural único', desc: 'Aguas tranquilas del pantano rodeadas de naturaleza virgen.' },
    { icon: '👨‍👩‍👧‍👦', title: 'Para toda la familia', desc: 'Actividades adaptadas para niños desde 4 años y mayores.' },
    { icon: '🛶', title: 'Flota en perfecto estado', desc: 'Equipos modernos, seguros y revisados diariamente.' },
    { icon: '📍', title: 'Fácil acceso', desc: 'A 1 hora de las principales ciudades, con parking gratuito.' },
  ],
};

const FALLBACK_CTA: CtaContent = {
  title: '¿Listo para tu aventura acuática?',
  body: 'Reserva hoy y asegura tu plaza. Plazas limitadas cada día.',
  primaryLabel: 'Reservar ahora',
  secondaryLabel: 'Más información',
  secondaryUrl: '/contactar',
};

// ─── Public API ──────────────────────────────────────────────────────────────

export async function getMenu(): Promise<MenuItem[]> {
  // /api/menu returns an array directly (not wrapped under `content`)
  return fetchCMS<MenuItem[]>('/api/menu', FALLBACK_MENU);
}

/** Misma derivación que el admin (WhatsAppEditor.jsx): wa.me/<phone limpio>?text=<msg>. */
function buildWhatsAppUrl(phone: string, message: string | undefined): string {
  const cleanPhone = phone.replace(/[\s\-+()]/g, '');
  const encoded = encodeURIComponent(message || '');
  return `https://wa.me/${cleanPhone}${encoded ? `?text=${encoded}` : ''}`;
}

export async function getSiteConfig(): Promise<SiteConfig> {
  // La sección `whatsapp` (la que edita el admin en admin.lacwake.es) es la
  // fuente primaria del número de reserva (CIBA-2443); los datos de contacto
  // (horario/dirección/teléfono/email) viven en la sección `contacto`, la que
  // edita el admin en Contacto (contrato CIBA-2497, sustituye a `site_config`
  // que nunca existió en el CMS — CIBA-2498).
  const [wa, c] = await Promise.all([
    fetchSection('/api/content/whatsapp'),
    fetchSection('/api/content/contacto'),
  ]);
  if (!wa && !c) return FALLBACK_SITE_CONFIG;
  const s = (f: string) => nonEmpty(c ? (c[f] as string | undefined) : undefined);
  const waPhone = nonEmpty(wa ? (wa['phone'] as string | undefined) : undefined);
  const waMessage = wa ? (wa['message'] as string | undefined) : undefined;
  const phone = waPhone ?? s('telefono') ?? FALLBACK_SITE_CONFIG.phone;
  const email = s('email') ?? FALLBACK_SITE_CONFIG.email;
  return {
    whatsappUrl: (waPhone ? buildWhatsAppUrl(waPhone, waMessage) : undefined)
      ?? FALLBACK_SITE_CONFIG.whatsappUrl,
    whatsappLabel: FALLBACK_SITE_CONFIG.whatsappLabel,
    whatsappLabelShort: FALLBACK_SITE_CONFIG.whatsappLabelShort,
    phone,
    phoneUrl: `tel:${phone.replace(/[\s\-()]/g, '')}`,
    email,
    emailUrl: `mailto:${email}`,
    address: s('direccion') ?? FALLBACK_SITE_CONFIG.address,
    schedule: s('horario') ?? FALLBACK_SITE_CONFIG.schedule,
  };
}

const FALLBACK_FOOTER: FooterContent = {
  logoImage: '',
  logoText: 'Lacwake',
  logoHref: '/',
  tagline:
    'Actividades acuáticas en el embalse de la Baells.\nKayak, wakeboard, paddle surf y más para toda la familia.',
  copyright: '© {year} Lacwake · Berguedà Nàutic SL',
  navActividades: [
    { label: 'Kayak', href: '/actividades/kayak' },
    { label: 'Hidropedales', href: '/actividades/hidropedales' },
    { label: 'Barcas a remos', href: '/actividades/barcas' },
    { label: 'Barca a motor', href: '/actividades/barca-motor' },
    { label: 'Paseos en barco', href: '/actividades/paseos-barco' },
    { label: 'Wakeboard', href: '/actividades/wakeboard' },
    { label: 'Wakesurf', href: '/actividades/wakesurf' },
    { label: 'Wakeskate', href: '/actividades/wakeskate' },
    { label: 'Esquí náutico', href: '/actividades/esqui-nautico' },
    // Slug canónico paddle-surf (CIBA-2522); /actividades/sup queda como 301.
    { label: 'Paddle Surf', href: '/actividades/paddle-surf' },
  ],
  navLegal: [
    { label: 'Aviso legal', href: '/aviso-legal' },
    { label: 'Política de privacidad', href: '/politica-privacidad' },
    { label: 'Política de cookies', href: '/politica-cookies' },
    { label: 'Condiciones', href: '/condiciones-contratacion' },
  ],
};

/**
 * Enlaces de navegación del footer. Filtra entradas sin `label`/`href` válidos;
 * si no queda ninguna (array ausente, vacío o mal formado) ⇒ fallback: el Board
 * no puede dejar una columna vacía por un guardado a medias.
 */
function parseFooterNav(v: unknown, fb: FooterNavItem[]): FooterNavItem[] {
  if (!Array.isArray(v)) return fb;
  const items = v
    .map((raw) => {
      const r = (raw ?? {}) as Raw;
      const label = vStr(r.label, '');
      const href = vStr(r.href ?? r.url, '');
      return label && href ? { label, href } : null;
    })
    .filter((i): i is FooterNavItem => i !== null);
  return items.length > 0 ? items : fb;
}

/**
 * Marca del footer desde la key `footer` del CMS. `logo_image` lo añade el
 * ticket de admin hermano (punto 5 CIBA-2376); mientras no exista, cae a
 * `logo_text` y el footer se ve idéntico al actual. Tagline, copyright y
 * columnas Actividades/Legal son editables desde el admin (CIBA-2402);
 * `legal_links` es la clave legacy de `nav_legal`.
 */
export async function getFooterContent(): Promise<FooterContent> {
  const c = await fetchSection('/api/content/footer');
  if (!c) return FALLBACK_FOOTER;
  const s = (f: string) => c[f] as string | undefined;
  return {
    logoImage: vStr(s('logo_image') ?? s('logoImage'), ''),
    logoText: s('logo_text') ?? s('logoText') ?? FALLBACK_FOOTER.logoText,
    logoHref: s('logo_href') ?? s('logoHref') ?? FALLBACK_FOOTER.logoHref,
    tagline: vStr(s('tagline'), FALLBACK_FOOTER.tagline),
    copyright: vStr(s('copyright'), FALLBACK_FOOTER.copyright),
    navActividades: parseFooterNav(
      c.nav_actividades ?? c.navActividades,
      FALLBACK_FOOTER.navActividades,
    ),
    navLegal: parseFooterNav(
      c.nav_legal ?? c.navLegal ?? c.legal_links,
      FALLBACK_FOOTER.navLegal,
    ),
  };
}

export async function getHeroContent(): Promise<HeroContent> {
  const c = await fetchSection('/api/content/hero');
  if (!c) return FALLBACK_HERO;
  const s = (f: string) => c[f] as string | undefined;

  // Bloques anidados nuevos (opcionales). Se leen defensivamente.
  const F = FALLBACK_HERO;
  const layout = (c.layout ?? {}) as Record<string, unknown>;
  const typo = (c.typography ?? {}) as Record<string, unknown>;
  const tTitle = (typo.title ?? {}) as Record<string, unknown>;
  const tSub = (typo.subtitle ?? {}) as Record<string, unknown>;
  const tBtn = (typo.button ?? {}) as Record<string, unknown>;
  const video = (c.video ?? {}) as Record<string, unknown>;

  return {
    title: s('title') ?? F.title,
    subtitle: s('subtitle') ?? F.subtitle,
    // Admin field is `video_url`; accept legacy `video_src` / camelCase as well
    videoUrl: s('video_url') ?? s('video_src') ?? s('videoUrl') ?? F.videoUrl,
    fallbackImage: s('fallback_image') ?? s('fallbackImage') ?? F.fallbackImage,
    // Variantes 9:16 (CIBA-2558): opcionales y con semántica nonEmpty — un ""
    // guardado desde el admin NO cuenta como valor (patrón CIBA-2403).
    videoUrlPortrait: nonEmpty(s('video_url_portrait')) ?? nonEmpty(s('videoUrlPortrait')),
    fallbackImagePortrait:
      nonEmpty(s('fallback_image_portrait')) ?? nonEmpty(s('fallbackImagePortrait')),
    // Admin fields are `cta_text` / `cta_href`; accept verbose `cta_primary_*` variants too
    ctaLabel: s('cta_text') ?? s('cta_primary_text') ?? s('ctaLabel') ?? F.ctaLabel,
    ctaUrl: s('cta_href') ?? s('cta_primary_href') ?? s('ctaUrl') ?? F.ctaUrl,
    ctaSecondaryLabel: s('cta_secondary_text') ?? s('ctaSecondaryLabel') ?? F.ctaSecondaryLabel,
    ctaSecondaryUrl: s('cta_secondary_href') ?? s('ctaSecondaryUrl') ?? F.ctaSecondaryUrl,

    // ─── Nuevos campos configurables (CIBA-2201) ───
    overline: s('overline') ?? F.overline,
    layout: {
      h: vEnum(layout.h, ['left', 'center', 'right'] as const, F.layout.h),
      v: vEnum(layout.v, ['top', 'center', 'bottom'] as const, F.layout.v),
    },
    typography: {
      title: {
        font: vStr(tTitle.font, F.typography.title.font),
        size: vNum(tTitle.size, F.typography.title.size, 8, 200),
        color: vHex(tTitle.color, F.typography.title.color),
        accentColor: vHex(
          tTitle.accent_color ?? tTitle.accentColor,
          F.typography.title.accentColor,
        ),
      },
      subtitle: {
        font: vStr(tSub.font, F.typography.subtitle.font),
        size: vNum(tSub.size, F.typography.subtitle.size, 8, 200),
        color: vHex(tSub.color, F.typography.subtitle.color),
      },
      button: {
        font: vStr(tBtn.font, F.typography.button.font),
        size: vNum(tBtn.size, F.typography.button.size, 8, 200),
        textColor: vHex(tBtn.text_color ?? tBtn.textColor, F.typography.button.textColor),
        bgColor: vHex(tBtn.bg_color ?? tBtn.bgColor, F.typography.button.bgColor),
      },
    },
    video: {
      preload: vEnum(video.preload, ['auto', 'metadata', 'none'] as const, F.video.preload),
      loop: typeof video.loop === 'boolean' ? video.loop : F.video.loop,
      soundIntent: vEnum(
        video.sound_intent ?? video.soundIntent,
        ['on', 'off'] as const,
        F.video.soundIntent,
      ),
    },
  };
}

// ─── Hero carrusel: defaults, parsing y fetch (CIBA-2217) ─────────────────────

const HERO_MAX_SLIDES = 5;
const HERO_MAX_BLOCKS = 5;
const HERO_DEFAULT_IMAGE_MS = 6000;
const HERO_DEFAULT_VIDEO_MS = 8000;
const HERO_DEFAULT_TRANSITION_MS = 800;

type Raw = Record<string, unknown>;

/** Mapea el bloque typography (snake_case del CMS) reusando los defaults del Hero. */
function parseHeroTypography(typoRaw: Raw): HeroSlide['typography'] {
  const F = FALLBACK_HERO.typography;
  const tTitle = (typoRaw.title ?? {}) as Raw;
  const tSub = (typoRaw.subtitle ?? {}) as Raw;
  const tBtn = (typoRaw.button ?? {}) as Raw;
  return {
    title: {
      font: vStr(tTitle.font, F.title.font),
      size: vNum(tTitle.size, F.title.size, 8, 200),
      color: vHex(tTitle.color, F.title.color),
      accentColor: vHex(tTitle.accent_color ?? tTitle.accentColor, F.title.accentColor),
    },
    subtitle: {
      font: vStr(tSub.font, F.subtitle.font),
      size: vNum(tSub.size, F.subtitle.size, 8, 200),
      color: vHex(tSub.color, F.subtitle.color),
    },
    button: {
      font: vStr(tBtn.font, F.button.font),
      size: vNum(tBtn.size, F.button.size, 8, 200),
      textColor: vHex(tBtn.text_color ?? tBtn.textColor, F.button.textColor),
      bgColor: vHex(tBtn.bg_color ?? tBtn.bgColor, F.button.bgColor),
    },
  };
}

function parseHeroLayout(layoutRaw: Raw): HeroSlide['layout'] {
  const F = FALLBACK_HERO.layout;
  return {
    h: vEnum(layoutRaw.h, ['left', 'center', 'right'] as const, F.h),
    v: vEnum(layoutRaw.v, ['top', 'center', 'bottom'] as const, F.v),
  };
}

function parseHeroVideo(videoRaw: Raw): HeroSlide['video'] {
  const F = FALLBACK_HERO.video;
  return {
    preload: vEnum(videoRaw.preload, ['auto', 'metadata', 'none'] as const, F.preload),
    loop: typeof videoRaw.loop === 'boolean' ? videoRaw.loop : F.loop,
    soundIntent: vEnum(videoRaw.sound_intent ?? videoRaw.soundIntent, ['on', 'off'] as const, F.soundIntent),
  };
}

/**
 * Duración por slide en segundos (1–60), campo opcional y aditivo del contrato.
 * Devuelve `undefined` cuando está ausente o fuera de rango → el carrusel hereda
 * el intervalo global (`rotation.intervalMs`). NO clampa: un valor inválido no
 * debe silenciarse a 1/60 s, sino delegar en el default global.
 */
function parseSlideDuration(v: unknown): number | undefined {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && n >= 1 && n <= 60 ? n : undefined;
}

/** Capa de texto plana de un slide; base del bloque sintetizado legacy. */
type HeroFlatText = Omit<HeroTextBlock, 'id' | 'duration'>;

/**
 * Bloque de texto explícito de `blocks[]` (contrato CIBA-2453 §1). `title` es
 * el único campo obligatorio (§5) — sin fallback: un bloque sin título se
 * descarta, no hereda el del slide. Los CTAs sí heredan de la capa plana del
 * slide (los botones de reserva persisten en bloques que no los redefinen);
 * la posición hereda del layout legacy del slide.
 */
function parseHeroTextBlock(raw: Raw, index: number, flat: HeroFlatText): HeroTextBlock {
  const s = (f: string) => raw[f] as string | undefined;
  const layoutRaw = (raw.layout ?? {}) as Raw;
  return {
    id: vStr(raw.id, `block-${index}`),
    title: vStr(raw.title, ''),
    overline: vStr(raw.overline, ''),
    subtitle: vStr(raw.subtitle, ''),
    ctaLabel: s('cta_primary_text') ?? s('cta_text') ?? s('ctaLabel') ?? flat.ctaLabel,
    ctaUrl: s('cta_primary_href') ?? s('cta_href') ?? s('ctaUrl') ?? flat.ctaUrl,
    ctaSecondaryLabel: s('cta_secondary_text') ?? s('ctaSecondaryLabel') ?? flat.ctaSecondaryLabel,
    ctaSecondaryUrl: s('cta_secondary_href') ?? s('ctaSecondaryUrl') ?? flat.ctaSecondaryUrl,
    layout: {
      h: vEnum(layoutRaw.h, ['left', 'center', 'right'] as const, flat.layout.h),
      v: vEnum(layoutRaw.v, ['top', 'center', 'bottom'] as const, flat.layout.v),
    },
    // Misma semántica que parseSlideDuration: fuera de rango/no numérico →
    // undefined (delega en los defaults de rotación de §3, no clampa).
    duration: parseSlideDuration(raw.duration),
  };
}

/** Convierte un HeroSlide crudo del contrato backend en un slide resuelto. */
function parseHeroSlide(raw: Raw, index: number): HeroSlide {
  const s = (f: string) => raw[f] as string | undefined;
  const bg = (raw.background ?? {}) as Raw;
  const videoUrl = vStr(bg.video_url ?? bg.videoUrl, '');
  const imageUrl = vStr(bg.image_url ?? bg.imageUrl, '');
  // Tipo: respeta el contrato; si es inválido, se infiere por el campo presente.
  const inferred: HeroBackgroundType = videoUrl ? 'video' : 'image';
  const type = vEnum(bg.type, ['image', 'video'] as const, inferred);

  const flat: HeroFlatText = {
    overline: s('overline') ?? FALLBACK_HERO.overline,
    title: s('title') ?? FALLBACK_HERO.title,
    subtitle: s('subtitle') ?? FALLBACK_HERO.subtitle,
    ctaLabel: s('cta_primary_text') ?? s('cta_text') ?? s('ctaLabel') ?? FALLBACK_HERO.ctaLabel,
    ctaUrl: s('cta_primary_href') ?? s('cta_href') ?? s('ctaUrl') ?? FALLBACK_HERO.ctaUrl,
    ctaSecondaryLabel: s('cta_secondary_text') ?? s('ctaSecondaryLabel') ?? FALLBACK_HERO.ctaSecondaryLabel,
    ctaSecondaryUrl: s('cta_secondary_href') ?? s('ctaSecondaryUrl') ?? FALLBACK_HERO.ctaSecondaryUrl,
    layout: parseHeroLayout((raw.layout ?? {}) as Raw),
  };

  // blocks[] explícito: descarta bloques sin título (§5) y limita a 5. Si el
  // slide no trae blocks[] (o queda vacío), se sintetiza un bloque único desde
  // la capa plana con duration:undefined → render idéntico al actual (§2).
  const rawBlocks = Array.isArray(raw.blocks) ? (raw.blocks as Raw[]) : [];
  const blocks = rawBlocks
    .map((b, i) => parseHeroTextBlock((b ?? {}) as Raw, i, flat))
    .filter((b) => b.title.trim() !== '')
    .slice(0, HERO_MAX_BLOCKS);

  return {
    id: vStr(raw.id, `slide-${index}`),
    active: raw.active !== false,
    order: vNum(raw.order, index, 0, 9999),
    background: {
      type,
      videoUrl,
      fallbackImage: vStr(bg.fallback_image ?? bg.fallbackImage, ''),
      imageUrl,
      // Variantes 9:16 por-slide (defensivo: el contrato CIBA-2558 las define
      // top-level, pero si el backend las espeja en el slide se respetan).
      videoUrlPortrait:
        vStr(bg.video_url_portrait ?? bg.videoUrlPortrait, '') || undefined,
      fallbackImagePortrait:
        vStr(bg.fallback_image_portrait ?? bg.fallbackImagePortrait, '') || undefined,
    },
    ...flat,
    typography: parseHeroTypography((raw.typography ?? {}) as Raw),
    video: parseHeroVideo((raw.video ?? {}) as Raw),
    duration: parseSlideDuration(raw.duration),
    blocks: blocks.length > 0 ? blocks : [{ id: 'block-0', ...flat }],
  };
}

function parseHeroRotation(raw: Raw): HeroRotation {
  const intervalMs = vNum(
    raw.intervalMs ?? raw.interval_ms ?? raw.default_image_ms,
    HERO_DEFAULT_IMAGE_MS,
    1000,
    60000,
  );
  const videoIntervalMs = vNum(
    raw.videoIntervalMs ?? raw.default_video_ms,
    Math.max(intervalMs, HERO_DEFAULT_VIDEO_MS),
    1000,
    60000,
  );
  const showArrows = raw.show_arrows ?? raw.showArrows;
  return {
    autoplay: typeof raw.autoplay === 'boolean' ? raw.autoplay : true,
    intervalMs,
    videoIntervalMs,
    transition: vEnum(raw.transition, ['fade', 'slide', 'none'] as const, 'fade'),
    transitionMs: vNum(raw.transitionMs ?? raw.transition_ms, HERO_DEFAULT_TRANSITION_MS, 0, 2000),
    showArrows: typeof showArrows === 'boolean' ? showArrows : false,
    loop: typeof raw.loop === 'boolean' ? raw.loop : true,
  };
}

/** Deriva un slide único a partir del contenido legacy del Hero (retrocompat / fallback). */
function legacySlideFromHero(h: HeroContent): HeroSlide {
  const type: HeroBackgroundType = h.videoUrl ? 'video' : 'image';
  const flat: HeroFlatText = {
    overline: h.overline,
    title: h.title,
    subtitle: h.subtitle,
    ctaLabel: h.ctaLabel,
    ctaUrl: h.ctaUrl,
    ctaSecondaryLabel: h.ctaSecondaryLabel,
    ctaSecondaryUrl: h.ctaSecondaryUrl,
    layout: h.layout,
  };
  return {
    id: 'legacy-hero',
    active: true,
    order: 0,
    background: {
      type,
      videoUrl: h.videoUrl,
      fallbackImage: h.fallbackImage,
      imageUrl: type === 'image' ? h.fallbackImage : '',
      videoUrlPortrait: h.videoUrlPortrait,
      fallbackImagePortrait: h.fallbackImagePortrait,
    },
    ...flat,
    typography: h.typography,
    video: h.video,
    blocks: [{ id: 'block-0', ...flat }],
  };
}

const DEFAULT_HERO_ROTATION: HeroRotation = {
  autoplay: true,
  intervalMs: HERO_DEFAULT_IMAGE_MS,
  videoIntervalMs: HERO_DEFAULT_VIDEO_MS,
  transition: 'fade',
  transitionMs: HERO_DEFAULT_TRANSITION_MS,
  showArrows: false,
  loop: true,
};

/**
 * Carrusel Hero multi-slide. Consume el endpoint público `GET /api/content/hero`
 * (contrato CIBA-2221), cuyo `content` es `{ slides:[...activos ordenados], rotation }`.
 * El backend ya filtra activos + ordena + normaliza heroes legacy en `slides[0]`.
 *
 * Retrocompat total: si el endpoint no expone `slides` (API caída o hero legacy sin
 * migrar), cae al contenido `content/hero` envuelto en un único slide → Hero
 * single-slide sin regresión.
 */
export async function getHeroSlides(): Promise<HeroCarousel> {
  const content = await fetchSection('/api/content/hero');

  const rawSlides = Array.isArray(content?.slides) ? (content!.slides as Raw[]) : [];
  if (rawSlides.length > 0) {
    const slides = rawSlides
      .map((r, i) => parseHeroSlide((r ?? {}) as Raw, i))
      .filter((s) => s.active)
      .sort((a, b) => a.order - b.order)
      .slice(0, HERO_MAX_SLIDES);

    if (slides.length > 0) {
      // Las variantes 9:16 del contrato CIBA-2558 son top-level en `content/hero`
      // (espejo del primer slide, igual que la capa legacy de CIBA-2453). Si el
      // primer slide no trae variante propia, hereda la top-level.
      const t = (f: string) => nonEmpty(content?.[f] as string | undefined);
      const first = slides[0].background;
      first.videoUrlPortrait ??= t('video_url_portrait') ?? t('videoUrlPortrait');
      first.fallbackImagePortrait ??=
        t('fallback_image_portrait') ?? t('fallbackImagePortrait');
      return { slides, rotation: parseHeroRotation((content?.rotation ?? {}) as Raw) };
    }
  }

  // Fallback legacy → un único slide (comportamiento idéntico al Hero actual).
  const legacy = await getHeroContent();
  return { slides: [legacySlideFromHero(legacy)], rotation: DEFAULT_HERO_ROTATION };
}

export async function getWhyContent(): Promise<WhyContent> {
  const c = await fetchSection('/api/content/why');
  if (!c) return FALLBACK_WHY;
  const s = (f: string) => c[f] as string | undefined;
  return {
    label: s('label') ?? FALLBACK_WHY.label,
    title: s('title') ?? FALLBACK_WHY.title,
    body1: s('body1') ?? FALLBACK_WHY.body1,
    body2: s('body2') ?? FALLBACK_WHY.body2,
    ctaLabel: s('cta_label') ?? s('ctaLabel') ?? FALLBACK_WHY.ctaLabel,
    features: (c.features as WhyContent['features'] | undefined) ?? FALLBACK_WHY.features,
  };
}

export async function getCtaContent(): Promise<CtaContent> {
  const c = await fetchSection('/api/content/cta');
  if (!c) return FALLBACK_CTA;
  const s = (f: string) => c[f] as string | undefined;
  return {
    title: s('title') ?? FALLBACK_CTA.title,
    body: s('body') ?? FALLBACK_CTA.body,
    primaryLabel: s('primary_label') ?? s('primaryLabel') ?? FALLBACK_CTA.primaryLabel,
    secondaryLabel: s('secondary_label') ?? s('secondaryLabel') ?? FALLBACK_CTA.secondaryLabel,
    secondaryUrl: s('secondary_url') ?? s('secondaryUrl') ?? FALLBACK_CTA.secondaryUrl,
  };
}

export async function getActivityContent(slug: string): Promise<ActivityContent | null> {
  const fallbacks: Record<string, ActivityContent> = {
    kayak: {
      title: 'Kayak',
      description: 'Descubre el pantano desde el agua a bordo de nuestros kayaks.',
      tag: 'Popular',
      duration: '1 – 3 horas',
      minAge: '6',
      price: 'Desde 12 €/h',
      included: ['Kayak (individual o doble)', 'Chaleco salvavidas', 'Remo y accesorios', 'Briefing de seguridad', 'Asistencia en agua'],
      body: '',
    },
    hidropedales: {
      title: 'Hidropedales',
      description: 'Explora el pantano en hidropedal, la actividad perfecta para familias.',
      tag: 'Familiar',
      duration: '1 – 2 horas',
      minAge: '4',
      price: 'Desde 10 €/h',
      included: ['Hidropedal (2-4 plazas)', 'Chaleco salvavidas', 'Briefing de seguridad'],
      body: '',
    },
    // Coherencia CIBA-2499: la página `/actividades/barcas` es «Barcas a remos»
    // (así la titula la ficha admin en prod); la semilla anterior decía «barca
    // eléctrica» y pisaba el título correcto cuando la API caía.
    barcas: {
      title: 'Barcas a remos',
      description: 'Rema tu propia barca por el pantano y conecta con la naturaleza a tu propio ritmo.',
      tag: 'Relajante',
      duration: '1 – 3 horas',
      minAge: '4',
      price: 'Desde 8 €/h',
      included: ['Barca a remos (2-4 plazas)', 'Remos y accesorios', 'Chalecos salvavidas', 'Instrucciones básicas de remo'],
      body: '',
    },
    // ── Barca a motor y Paseos en barco (CIBA-2499) — páginas propias; semilla
    //    espejo de las fichas sembradas en prod por fix-content-CIBA-2379.
    'barca-motor': {
      title: 'Barca a motor',
      description: 'Toma el timón y explora el pantano a tu aire. Sin licencia, con briefing.',
      tag: 'A tu aire',
      duration: '1 – 3 horas',
      minAge: '18',
      price: 'Consultar',
      included: ['Barca a motor', 'Chalecos salvavidas', 'Briefing de seguridad', 'Combustible incluido', 'Seguro de responsabilidad'],
      body: '',
    },
    'paseos-barco': {
      title: 'Paseos en barco',
      description: 'Déjate llevar. Un recorrido guiado por los rincones más bonitos del pantano.',
      tag: 'Guiado',
      duration: '1 – 2 horas',
      minAge: '0',
      price: 'Consultar',
      included: ['Embarque desde instalaciones Lacwake', 'Guía local', 'Chalecos salvavidas', 'Comentario sobre el entorno natural'],
      body: '',
    },
    // ── Wake & Esquí (CIBA-2345) — semilla = blurbs/tags existentes de
    //    actividades.ts. NO se inventan duración/precio/edad: el Board los
    //    completará vía admin (B1/B2). description = blurb del catálogo.
    wakeboard: {
      title: 'Wakeboard',
      description: 'Salta la estela con la tabla anclada. El deporte estrella de Lacwake.',
      tag: 'Intenso',
      body: '',
    },
    wakesurf: {
      title: 'Wakesurf',
      description: 'Surfea la ola de la lancha sin cuerda. Fluido, técnico y adictivo.',
      tag: 'Técnico',
      body: '',
    },
    wakeskate: {
      title: 'Wakeskate',
      description: 'La tabla suelta, tú al mando. Skate sobre agua para los más atrevidos.',
      tag: 'Avanzado',
      body: '',
    },
    'esqui-nautico': {
      title: 'Esquí Náutico',
      description: 'El clásico que nunca falla. Dos esquís, velocidad y pura diversión.',
      tag: 'Clásico',
      body: '',
    },
    // ── Paddle Surf (CIBA-2522) — slug canónico `paddle-surf`; la tarjeta de la
    //    home enlaza aquí vía la ruta dinámica. Semilla = blurb/tag del catálogo
    //    para que la página exista aunque la fila CMS aún no esté migrada
    //    (migración prod en ticket aparte) o la API caiga.
    'paddle-surf': {
      title: 'Paddle Surf',
      description: 'De pie sobre la tabla, remando en calma. Equilibrio y paz sobre el agua.',
      tag: 'Relajado',
      body: '',
    },
  };

  const fb = fallbacks[slug] ?? null;
  const c = await fetchSection(`/api/content/actividad_${slug}`);
  if (!c) return fb;
  const s = (f: string) => c[f] as string | undefined;
  return {
    // Campo vaciado desde el admin (`""`) = ausente: cae a la semilla/hardcode
    // en vez de propagar el vacío al layout (CIBA-2403).
    // Admin uses `page_title`; DB seed used `title` — accept both
    title: nonEmpty(s('page_title')) ?? nonEmpty(s('title')) ?? fb?.title ?? '',
    description: nonEmpty(s('description')) ?? fb?.description ?? '',
    tag: nonEmpty(s('tag')) ?? fb?.tag,
    duration: nonEmpty(s('duration')) ?? fb?.duration,
    minAge: nonEmpty(s('min_age')) ?? nonEmpty(s('minAge')) ?? fb?.minAge,
    price: nonEmpty(s('price')) ?? fb?.price,
    // Admin uses `features` (string[]); fallback type uses `included`
    included: (c.features as string[] | undefined) ?? (c.included as string[] | undefined) ?? fb?.included,
    // El ActivityEditor del admin (TipTap) guarda el cuerpo en `html_content`;
    // el seed legacy usaba `body`. Prioridad html_content: el seed dejó `body`
    // vacío/legacy y el admin sólo escribe html_content (CIBA-2396)
    body: nonEmptyHtml(s('html_content')) ?? nonEmptyHtml(s('body')) ?? fb?.body ?? '',
    image: nonEmpty(s('image')) ?? fb?.image,
    imageAlt: nonEmpty(s('imageAlt')) ?? nonEmpty(s('image_alt')) ?? fb?.imageAlt,
  };
}

// ─── Índice público de actividades (GET /api/activities, CIBA-2522) ──────────

/** Familia de la home donde sale la tarjeta (contrato CIBA-2519). */
export type ActivityCardFamily = 'kayak' | 'wake' | 'tranquilo';

/**
 * Entrada del índice público de actividades del cms-api. Los campos `card_*`
 * pilotan la tarjeta de la home (visibilidad, familia, blurb y orden); el
 * `href` NUNCA viene del CMS — siempre se deriva `/actividades/<slug>`.
 */
export interface ActivityIndexEntry {
  slug: string;
  title: string;
  description: string;
  tag?: string;
  image?: string;
  imageAlt?: string;
  cardFamily: ActivityCardFamily;
  cardVisible: boolean;
  cardBlurb: string;
  cardOrder: number;
}

/**
 * Índice de todas las secciones `actividad_*` del CMS vía `GET /api/activities`
 * (endpoint público del cms-api, contrato CIBA-2519). Respuesta:
 * `[ { slug, content: {...}, updated_at } ]`.
 *
 * Devuelve `null` si el CMS está caído, la respuesta no es un array o el
 * endpoint aún no está desplegado (404): la home cae al catálogo semilla sin
 * regresión — cero dependencia dura del deploy del cms-api.
 */
export async function getActivitiesIndex(): Promise<ActivityIndexEntry[] | null> {
  const raw = await fetchCMS<Raw[] | null>('/api/activities', null);
  if (!Array.isArray(raw)) return null;

  const entries: ActivityIndexEntry[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const slug = vStr(row.slug, '');
    const content = row.content;
    if (!slug || !content || typeof content !== 'object') continue;
    const c = content as Raw;
    const s = (f: string) => (typeof c[f] === 'string' ? (c[f] as string) : undefined);
    const description = nonEmpty(s('description')) ?? '';
    entries.push({
      slug,
      // Mismos alias que getActivityContent: el admin escribe `page_title`,
      // el seed legacy `title`.
      title: nonEmpty(s('page_title')) ?? nonEmpty(s('title')) ?? slug,
      description,
      tag: nonEmpty(s('tag')),
      image: nonEmpty(s('image')),
      imageAlt: nonEmpty(s('imageAlt')) ?? nonEmpty(s('image_alt')),
      cardFamily: vEnum(c.card_family, ['kayak', 'wake', 'tranquilo'] as const, 'tranquilo'),
      // Sólo `false` explícito oculta la tarjeta (default true, CIBA-2519).
      cardVisible: c.card_visible !== false,
      cardBlurb: nonEmpty(s('card_blurb')) ?? description,
      cardOrder:
        typeof c.card_order === 'number' && Number.isFinite(c.card_order)
          ? c.card_order
          : 999,
    });
  }
  return entries;
}

/**
 * Contenido editable de la home (key `home`, contrato CIBA-2343).
 * `activities` es la lista AUTORITATIVA de tarjetas de la home (CIBA-2538):
 * lo que el admin («Home (tarjetas)») guarda es exactamente lo que se pinta —
 * una tarjeta borrada en admin desaparece de la web.
 *
 * Devuelve `null` si el CMS está caído, la key no existe o no trae `activities`
 * (array): la home cae al catálogo semilla sin regresión.
 *
 * Nota: `dividers` vive en la misma key pero lo lee getHomeDividers (CIBA-2346).
 */
export async function getHomeContent(): Promise<HomeContent | null> {
  const c = await fetchSection('/api/content/home');
  if (!c || !Array.isArray(c.activities)) return null;
  const activities = (c.activities as Raw[])
    .map((raw) => parseHomeActivity((raw ?? {}) as Raw))
    .filter((a): a is HomeActivity => a !== null);
  return { activities };
}

/** Parsea una card `home.activities[]` del CMS. Requiere `id` para casar la card. */
function parseHomeActivity(raw: Raw): HomeActivity | null {
  const s = (f: string) => (typeof raw[f] === 'string' ? (raw[f] as string) : undefined);
  const id = vStr(raw.id ?? raw.slug, '');
  if (!id) return null;
  return {
    id,
    family: s('family'),
    title: s('title'),
    blurb: s('blurb'),
    tag: s('tag'),
    image: s('image'),
    imageAlt: s('image_alt') ?? s('imageAlt'),
    pageHref: s('page_href') ?? s('pageHref'),
    ctaType: s('cta_type') ?? s('ctaType'),
    ctaLabel: s('cta_label') ?? s('ctaLabel'),
    ctaWhatsappMessage: s('cta_whatsapp_message') ?? s('ctaWhatsappMessage'),
  };
}

export async function getLegalContent(page: string): Promise<LegalContent | null> {
  // Section keys in the CMS admin: aviso_legal, privacidad, cookies, condiciones
  // Pages call this as getLegalContent('aviso_legal'), getLegalContent('privacidad'), etc.
  const c = await fetchSection(`/api/content/${page}`);
  if (!c) return null;
  const s = (f: string) => c[f] as string | undefined;
  // nonEmpty/nonEmptyHtml: un campo vacío ('' o el <p></p> de TipTap) debe
  // dejar caer la página a su fallback hardcoded, no renderizar en blanco.
  return {
    title: nonEmpty(s('title')) ?? '',
    // Admin LegalEditor saves HTML under the `html` field
    body: nonEmptyHtml(s('body')) ?? nonEmptyHtml(s('html')) ?? '',
    lastUpdated: nonEmpty(s('last_updated')) ?? nonEmpty(s('lastUpdated')) ?? '',
  };
}

// ─── Divisores de sección (contrato `home.dividers`, CIBA-2346) ───────────────

const DIVIDER_BOUNDARIES: readonly DividerBoundary[] = [
  'hero-activities',
  'activities-why',
  'why-cta',
  'footer',
] as const;

/**
 * Por defecto los divisores están ACTIVOS (onda en las cuatro fronteras) para
 * que la home no muestre cortes planos aunque el CMS aún no exponga `home.dividers`
 * (el admin «Home» llega en B1/CIBA-2347). El Board puede apagarlos con
 * `style:'none'` o recortar `between` desde el CMS. `color:''` ⇒ cada frontera
 * usa el color de su sección entrante (ver SectionDivider).
 */
const FALLBACK_DIVIDERS: HomeDividers = {
  style: 'wave',
  asset: '/assets/dividers/wave.svg',
  color: '',
  between: [...DIVIDER_BOUNDARIES],
};

function parseDividerBetween(v: unknown): DividerBoundary[] {
  if (!Array.isArray(v)) return [...DIVIDER_BOUNDARIES];
  const valid = v.filter(
    (x): x is DividerBoundary => typeof x === 'string' && (DIVIDER_BOUNDARIES as readonly string[]).includes(x),
  );
  // Sin entradas válidas ⇒ conserva el default (no dejamos la home sin divisores
  // por un array mal formado); un array vacío explícito sí desactiva todo.
  return v.length > 0 ? valid : [...DIVIDER_BOUNDARIES];
}

/**
 * Config de divisores de la home. Lee `home.dividers` del CMS (key `home`,
 * contrato CIBA-2343/2346) con validación defensiva y fallback resiliente.
 * Si la key no existe o `dividers` está ausente ⇒ `FALLBACK_DIVIDERS`.
 */
export async function getHomeDividers(): Promise<HomeDividers> {
  const c = await fetchSection('/api/content/home');
  const raw = (c?.dividers ?? null) as Raw | null;
  if (!raw || typeof raw !== 'object') return FALLBACK_DIVIDERS;

  const color = raw.color;
  return {
    style: vEnum(raw.style, ['wave', 'slant', 'image', 'none'] as const, FALLBACK_DIVIDERS.style),
    asset: vStr(raw.asset, FALLBACK_DIVIDERS.asset),
    // `color` opcional: hex de 6 dígitos o cadena vacía (= derivar por frontera).
    color: typeof color === 'string' && HEX_RE.test(color.trim()) ? color.trim() : '',
    between: parseDividerBetween(raw.between),
  };
}

/**
 * CSS personalizado editable desde el admin (CIBA-2512, key `site_custom_css`,
 * campo `css`). El middleware (src/middleware.ts) lo inyecta como último
 * <style> del <head>, tras los <link> bundleados de Astro, para máxima
 * prioridad en cascada. Key ausente, API caída o campo vacío ⇒ `''`
 * (el middleware no inyecta la etiqueta). Defensa en profundidad: aunque el
 * API ya rechaza `</style`, aquí se elimina cualquier secuencia que pudiera
 * cerrar la etiqueta antes de inyectarlo en el HTML.
 */
export async function getCustomCss(): Promise<string> {
  const c = await fetchSection('/api/content/site_custom_css');
  const raw = c && typeof c['css'] === 'string' ? (c['css'] as string) : undefined;
  const css = nonEmpty(raw);
  if (!css) return '';
  return css.replace(/<\/style/gi, '');
}

/**
 * Metadatos SEO de una página, editables desde el admin (CIBA-2561, key única
 * `site_seo`, contrato CIBA-2560: `{ pages: { <pageKey>: {…} } }`).
 * Cada campo es un override opcional: `undefined` ⇒ la página conserva su
 * valor actual (semántica nonEmpty, CIBA-2403: `""` no pisa el fallback).
 */
export interface SeoMeta {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonical?: string;
}

/**
 * Overrides SEO para una pageKey del contrato (`home`, `actividades`,
 * `actividad_<slug>`, `aviso_legal`, `privacidad`, `cookies`, `condiciones`).
 * Key ausente, API caída o página sin entrada ⇒ objeto vacío (head intacto).
 */
export async function getSeo(pageKey: string): Promise<SeoMeta> {
  const c = await fetchSection('/api/content/site_seo');
  const pages = c && typeof c['pages'] === 'object' && c['pages'] !== null ? (c['pages'] as Raw) : null;
  const page = pages && typeof pages[pageKey] === 'object' && pages[pageKey] !== null ? (pages[pageKey] as Raw) : null;
  if (!page) return {};
  const s = (f: string) => nonEmpty(typeof page[f] === 'string' ? (page[f] as string) : undefined);
  return {
    title: s('title'),
    description: s('description'),
    keywords: s('keywords'),
    ogTitle: s('og_title'),
    ogDescription: s('og_description'),
    ogImage: s('og_image'),
    canonical: s('canonical'),
  };
}

/**
 * JS personalizado editable desde el admin (CIBA-2562/CIBA-2563, keys
 * `site_custom_js_head` y `site_custom_js_body`, campo `js`). Snippets de
 * seguimiento (gtag y similares) que el middleware inyecta VERBATIM ante
 * `</head>` y `</body>` respectivamente: el valor ya incluye sus etiquetas
 * <script> y NO se escapa ni se envuelve — es inyección deliberada del
 * propietario del sitio (contrato CTO en CIBA-2562; el único control es la
 * sesión admin autenticada; un `</script>` interno se inyecta tal cual,
 * riesgo documentado y asumido). Key ausente, API caída o campo vacío ⇒ `''`
 * y el middleware no inyecta nada (HTML idéntico al actual). Cache: la de
 * fetchSection, mismo TTL que el CSS personalizado.
 */
export async function getCustomJs(): Promise<{ head: string; body: string }> {
  const [h, b] = await Promise.all([
    fetchSection('/api/content/site_custom_js_head'),
    fetchSection('/api/content/site_custom_js_body'),
  ]);
  const pick = (c: Record<string, unknown> | null): string =>
    nonEmpty(c && typeof c['js'] === 'string' ? (c['js'] as string) : undefined) ?? '';
  return { head: pick(h), body: pick(b) };
}
