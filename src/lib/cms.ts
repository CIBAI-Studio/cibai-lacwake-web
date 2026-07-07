/**
 * CMS data-fetching layer with in-memory cache (TTL 5 min) and graceful fallback.
 * Connects to CMS_API_URL env var; uses hardcoded defaults when API is unavailable.
 */

const CMS_API_URL = import.meta.env.CMS_API_URL ?? '';
const CACHE_TTL_MS = 5 * 60 * 1000;

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

export interface HeroContent {
  title: string;
  subtitle: string;
  videoUrl: string;
  fallbackImage: string;
  ctaLabel: string;
  ctaUrl: string;
  ctaSecondaryLabel: string;
  ctaSecondaryUrl: string;
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

// ─── Fallbacks ───────────────────────────────────────────────────────────────

const FALLBACK_MENU: MenuItem[] = [
  { label: 'Inicio', href: '/' },
  { label: 'Actividades', href: '/#actividades' },
  { label: 'Contactar', href: '/contactar' },
];

const FALLBACK_SITE_CONFIG: SiteConfig = {
  whatsappUrl: 'https://wa.me/34600000000?text=Hola%2C%20quiero%20reservar%20una%20actividad%20en%20Lacwake',
  whatsappLabel: 'Reservar ahora',
  whatsappLabelShort: 'Reservar',
  phone: '+34 600 000 000',
  phoneUrl: 'tel:+34600000000',
  email: 'info@lacwake.es',
  emailUrl: 'mailto:info@lacwake.es',
  address: 'Pantano de Sau, Girona',
  schedule: 'Todos los días 9:00 – 20:00 (temporada)',
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
};

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

export async function getSiteConfig(): Promise<SiteConfig> {
  const c = await fetchSection('/api/content/site_config');
  if (!c) return FALLBACK_SITE_CONFIG;
  const s = (f: string) => c[f] as string | undefined;
  return {
    whatsappUrl: s('whatsapp_url') ?? s('whatsappUrl') ?? FALLBACK_SITE_CONFIG.whatsappUrl,
    whatsappLabel: s('whatsapp_label') ?? s('whatsappLabel') ?? FALLBACK_SITE_CONFIG.whatsappLabel,
    whatsappLabelShort: s('whatsapp_label_short') ?? s('whatsappLabelShort') ?? FALLBACK_SITE_CONFIG.whatsappLabelShort,
    phone: s('phone') ?? FALLBACK_SITE_CONFIG.phone,
    phoneUrl: s('phone_url') ?? s('phoneUrl') ?? FALLBACK_SITE_CONFIG.phoneUrl,
    email: s('email') ?? FALLBACK_SITE_CONFIG.email,
    emailUrl: s('email_url') ?? s('emailUrl') ?? FALLBACK_SITE_CONFIG.emailUrl,
    address: s('address') ?? FALLBACK_SITE_CONFIG.address,
    schedule: s('schedule') ?? FALLBACK_SITE_CONFIG.schedule,
  };
}

export async function getHeroContent(): Promise<HeroContent> {
  const c = await fetchSection('/api/content/hero');
  if (!c) return FALLBACK_HERO;
  const s = (f: string) => c[f] as string | undefined;
  return {
    title: s('title') ?? FALLBACK_HERO.title,
    subtitle: s('subtitle') ?? FALLBACK_HERO.subtitle,
    // Admin field is `video_url`; accept legacy `video_src` / camelCase as well
    videoUrl: s('video_url') ?? s('video_src') ?? s('videoUrl') ?? FALLBACK_HERO.videoUrl,
    fallbackImage: s('fallback_image') ?? s('fallbackImage') ?? FALLBACK_HERO.fallbackImage,
    // Admin fields are `cta_text` / `cta_href`; accept verbose `cta_primary_*` variants too
    ctaLabel: s('cta_text') ?? s('cta_primary_text') ?? s('ctaLabel') ?? FALLBACK_HERO.ctaLabel,
    ctaUrl: s('cta_href') ?? s('cta_primary_href') ?? s('ctaUrl') ?? FALLBACK_HERO.ctaUrl,
    ctaSecondaryLabel: s('cta_secondary_text') ?? s('ctaSecondaryLabel') ?? FALLBACK_HERO.ctaSecondaryLabel,
    ctaSecondaryUrl: s('cta_secondary_href') ?? s('ctaSecondaryUrl') ?? FALLBACK_HERO.ctaSecondaryUrl,
  };
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
    barcas: {
      title: 'Barcas',
      description: 'Navega a tu ritmo en una barca eléctrica silenciosa.',
      tag: 'Tranquilo',
      duration: '1 – 3 horas',
      minAge: '0',
      price: 'Desde 15 €/h',
      included: ['Barca eléctrica', 'Chalecos salvavidas', 'Briefing de seguridad'],
      body: '',
    },
  };

  const fb = fallbacks[slug] ?? null;
  const c = await fetchSection(`/api/content/actividad_${slug}`);
  if (!c) return fb;
  const s = (f: string) => c[f] as string | undefined;
  return {
    // Admin uses `page_title`; DB seed used `title` — accept both
    title: s('page_title') ?? s('title') ?? fb?.title ?? '',
    description: s('description') ?? fb?.description ?? '',
    tag: s('tag') ?? fb?.tag,
    duration: s('duration') ?? fb?.duration,
    minAge: s('min_age') ?? s('minAge') ?? fb?.minAge,
    price: s('price') ?? fb?.price,
    // Admin uses `features` (string[]); fallback type uses `included`
    included: (c.features as string[] | undefined) ?? (c.included as string[] | undefined) ?? fb?.included,
    body: s('body') ?? fb?.body ?? '',
  };
}

export async function getLegalContent(page: string): Promise<LegalContent | null> {
  // Section keys in the CMS admin: aviso_legal, privacidad, cookies, condiciones
  // Pages call this as getLegalContent('aviso_legal'), getLegalContent('privacidad'), etc.
  const c = await fetchSection(`/api/content/${page}`);
  if (!c) return null;
  const s = (f: string) => c[f] as string | undefined;
  return {
    title: s('title') ?? '',
    // Admin LegalEditor saves HTML under the `html` field
    body: s('body') ?? s('html') ?? '',
    lastUpdated: s('last_updated') ?? s('lastUpdated') ?? '',
  };
}
