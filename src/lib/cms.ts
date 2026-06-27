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
  subtitle: 'Kayak, hidropedales y barcas en plena naturaleza. El pantano te espera.',
  videoUrl: '/assets/videos/hero.mp4',
  fallbackImage: '/assets/images/hero-fallback.jpg',
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
  return fetchCMS<MenuItem[]>('/api/menu', FALLBACK_MENU);
}

export async function getSiteConfig(): Promise<SiteConfig> {
  return fetchCMS<SiteConfig>('/api/content/site_config', FALLBACK_SITE_CONFIG);
}

export async function getHeroContent(): Promise<HeroContent> {
  return fetchCMS<HeroContent>('/api/content/hero', FALLBACK_HERO);
}

export async function getWhyContent(): Promise<WhyContent> {
  return fetchCMS<WhyContent>('/api/content/why', FALLBACK_WHY);
}

export async function getCtaContent(): Promise<CtaContent> {
  return fetchCMS<CtaContent>('/api/content/cta', FALLBACK_CTA);
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
  return fetchCMS<ActivityContent | null>(
    `/api/content/actividad_${slug}`,
    fallbacks[slug] ?? null,
  );
}

export async function getLegalContent(page: string): Promise<LegalContent | null> {
  return fetchCMS<LegalContent | null>(`/api/content/legal_${page}`, null);
}
