/**
 * Datos de contacto y reservas — valores estáticos de referencia.
 * En SSR, estos valores son sustituidos por los del CMS (src/lib/cms.ts).
 * Se mantienen aquí como fallback de último recurso y para referencia.
 */
export const RESERVAS = {
  url: 'https://wa.me/34676881982?text=Hola%2C%20quiero%20reservar%20una%20actividad%20en%20Lacwake',
  label: 'Reservar ahora',
  labelShort: 'Reservar',
} as const;

export const CONTACTO = {
  telefono: '+34 676 88 19 82',
  telefonoUrl: 'tel:+34676881982',
  email: 'info@lacwake.es',
  emailUrl: 'mailto:info@lacwake.es',
  direccion: 'Embalse de la Baells — Cercs (Berguedà, Barcelona)',
  horario: 'Todos los días 9:00 – 20:00 (temporada)',
  latLng: [42.1460, 1.8760] as [number, number],
} as const;
