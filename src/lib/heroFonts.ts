/**
 * Registro de fuentes del Hero (self-host).
 *
 * El CMS envía un `fontKey` por elemento (title/subtitle/button). Aquí se resuelve
 * a un font-family stack real y al fichero .woff2 self-hosted (para el preload).
 *
 * Set INTERINO (CIBA-2199 aún en curso): Anton / Oswald / Bebas Neue (display) +
 * Space Grotesk + Inter. Cuando Designer cierre el set final, se intercambian los
 * ficheros y las claves aquí sin tocar el resto del render.
 */

export interface HeroFont {
  /** Clave canónica del CMS. */
  key: string;
  /** Valor completo de `font-family` (con fallbacks del sistema). */
  family: string;
  /** Ruta pública del .woff2 self-hosted (para `<link rel="preload">`). */
  file: string;
}

const SYS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export const HERO_FONTS: Record<string, HeroFont> = {
  anton: {
    key: 'anton',
    family: `'Anton', 'Oswald', ${SYS}`,
    file: '/assets/fonts/anton-latin.woff2',
  },
  oswald: {
    key: 'oswald',
    family: `'Oswald', ${SYS}`,
    file: '/assets/fonts/oswald-latin.woff2',
  },
  bebas: {
    key: 'bebas',
    family: `'Bebas Neue', 'Oswald', ${SYS}`,
    file: '/assets/fonts/bebasneue-latin.woff2',
  },
  'archivo-narrow': {
    key: 'archivo-narrow',
    family: `'Archivo Narrow', 'Oswald', ${SYS}`,
    file: '/assets/fonts/archivonarrow-latin.woff2',
  },
  'space-grotesk': {
    key: 'space-grotesk',
    family: `'Space Grotesk', ${SYS}`,
    file: '/assets/fonts/spacegrotesk-latin.woff2',
  },
  inter: {
    key: 'inter',
    family: `'Inter', ${SYS}`,
    file: '/assets/fonts/inter-latin.woff2',
  },
};

/** Alias tolerantes: distintas formas en que el admin puede escribir la clave. */
const ALIASES: Record<string, string> = {
  'bebas-neue': 'bebas',
  bebasneue: 'bebas',
  'bebas neue': 'bebas',
  spacegrotesk: 'space-grotesk',
  space_grotesk: 'space-grotesk',
  'space grotesk': 'space-grotesk',
  archivonarrow: 'archivo-narrow',
  archivo_narrow: 'archivo-narrow',
  'archivo narrow': 'archivo-narrow',
  default: 'space-grotesk',
  heading: 'space-grotesk',
  body: 'inter',
};

/**
 * Resuelve una `fontKey` del CMS a un `HeroFont`. Nunca devuelve null:
 * clave desconocida → `fallbackKey` → Space Grotesk.
 */
export function resolveHeroFont(
  key: string | null | undefined,
  fallbackKey: string,
): HeroFont {
  const norm = (key ?? '').toString().trim().toLowerCase();
  return (
    HERO_FONTS[norm] ??
    HERO_FONTS[ALIASES[norm]] ??
    HERO_FONTS[fallbackKey] ??
    HERO_FONTS['space-grotesk']
  );
}
