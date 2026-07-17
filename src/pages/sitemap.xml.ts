import type { APIRoute } from 'astro';
import { getActivitiesIndex } from '../lib/cms';

/**
 * Sitemap dinámico SSR (CIBA-2561): home, actividades (rutas estáticas + catálogo
 * CMS, CIBA-2519), contacto y legales. Sustituye a la integración estática
 * `@astrojs/sitemap`, que con `output: 'server'` no emitía nada (robots.txt
 * apuntaba a un sitemap-index.xml inexistente).
 *
 * Nota deploy: en public_html no debe quedar un `sitemap.xml` estático que
 * bloquee esta ruta SSR (patrón CIBA-2204).
 */

const SITE = 'https://lacwake.es';

// Actividades con ruta file-based propia: siempre resuelven (semilla local),
// aunque el CMS esté caído. `paddle-surf` resuelve vía [slug] + semilla (CIBA-2522).
const STATIC_ACTIVITY_SLUGS = [
  'kayak',
  'hidropedales',
  'barcas',
  'barca-motor',
  'paseos-barco',
  'wakeboard',
  'wakesurf',
  'wakeskate',
  'esqui-nautico',
  'paddle-surf',
];

const OTHER_PATHS = [
  '/contactar',
  '/aviso-legal',
  '/politica-privacidad',
  '/politica-cookies',
  '/condiciones-contratacion',
];

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const GET: APIRoute = async () => {
  const slugs = new Set(STATIC_ACTIVITY_SLUGS);
  for (const entry of (await getActivitiesIndex()) ?? []) {
    slugs.add(entry.slug);
  }

  const paths = [
    '/',
    ...[...slugs].sort().map((s) => `/actividades/${s}`),
    ...OTHER_PATHS,
  ];

  const urlset = paths
    .map((p) => `  <url><loc>${xmlEscape(SITE + p)}</loc></url>`)
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlset}
</urlset>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
