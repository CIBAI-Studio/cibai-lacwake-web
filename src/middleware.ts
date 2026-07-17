import type { MiddlewareHandler } from 'astro';
import { getCustomCss, getCustomJs } from './lib/cms';

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

/**
 * CSS y JS personalizados del admin (CIBA-2512 `site_custom_css`,
 * CIBA-2563 `site_custom_js_head` / `site_custom_js_body`).
 *
 * Se inyectan aquí (post-procesado del HTML) y no en BaseLayout porque Astro
 * añade sus <link rel="stylesheet"> bundleados SIEMPRE después del contenido
 * literal del <head> — un <style> escrito en el layout nunca puede quedar
 * último. Insertar justo antes de </head> garantiza máxima prioridad en
 * cascada sin `!important`. El CSS llega saneado (sin `</style`) desde
 * getCustomCss(). El JS se inyecta VERBATIM (los snippets ya traen sus
 * <script>; ver contrato en getCustomJs): head ante `</head>`, body ante
 * `</body>`. Todo vacío ⇒ la respuesta pasa intacta (sin etiquetas vacías,
 * sin re-serializar el HTML).
 */
async function injectCustomHtml(response: Response): Promise<Response> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('text/html')) return response;

  const [css, js] = await Promise.all([getCustomCss(), getCustomJs()]);
  if (!css && !js.head && !js.body) return response;

  let html = await response.text();
  const headInsert = `${css ? `<style id="custom-css">${css}</style>` : ''}${js.head}`;
  if (headInsert) {
    const idx = html.lastIndexOf('</head>');
    if (idx !== -1) html = html.slice(0, idx) + headInsert + html.slice(idx);
  }
  if (js.body) {
    const idx = html.lastIndexOf('</body>');
    if (idx !== -1) html = html.slice(0, idx) + js.body + html.slice(idx);
  }

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

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
    // Sin CSS ni JS personalizados: /mantenimiento es la página degradada y
    // endurecida frente a un CMS comprometido; se mantiene mínima (igual que
    // en acceso directo).
    return context.rewrite("/mantenimiento");
  }

  return injectCustomHtml(await next());
};
