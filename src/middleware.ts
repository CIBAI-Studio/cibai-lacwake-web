import type { MiddlewareHandler } from 'astro';

const CMS_API_URL = import.meta.env.CMS_API_URL ?? '';
const CACHE_TTL_MS = 30_000;

let _cache: { enabled: boolean; expiresAt: number } | null = null;

async function isMaintenanceModeEnabled(): Promise<boolean> {
  if (_cache && Date.now() < _cache.expiresAt) return _cache.enabled;
  if (!CMS_API_URL) return false;
  try {
    const res = await fetch(`${CMS_API_URL}/api/maintenance`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return _cache?.enabled ?? false;
    const data = await res.json() as { enabled?: boolean };
    const enabled = !!data.enabled;
    _cache = { enabled, expiresAt: Date.now() + CACHE_TTL_MS };
    return enabled;
  } catch {
    return _cache?.enabled ?? false;
  }
}

const SKIP_PREFIXES = ["/_astro", "/favicon", "/uploads", "/assets"];

export const onRequest: MiddlewareHandler = async (context, next) => {
  const { pathname } = context.url;

  // Pasar sin comprobación: assets, rutas internas, y la propia página de mantenimiento
  if (
    pathname === "/mantenimiento" ||
    SKIP_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    return next();
  }

  const maintenance = await isMaintenanceModeEnabled();
  if (maintenance) {
    return context.rewrite("/mantenimiento");
  }

  return next();
};
