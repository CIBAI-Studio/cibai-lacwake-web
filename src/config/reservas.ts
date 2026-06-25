/**
 * URL centralizada del botón "Reservar".
 * Cambiar este valor actualiza todos los CTAs del sitio.
 * Hoy: WhatsApp directo. Futuro: URL plataforma de reservas.
 */
export const RESERVAS = {
  url: 'https://wa.me/34600000000?text=Hola%2C%20quiero%20reservar%20una%20actividad%20en%20Lacwake',
  label: 'Reservar ahora',
  labelShort: 'Reservar',
} as const;

/** Datos de contacto centralizados */
export const CONTACTO = {
  telefono: '+34 600 000 000',
  telefonoUrl: 'tel:+34600000000',
  email: 'info@lacwake.es',
  emailUrl: 'mailto:info@lacwake.es',
  direccion: 'Pantano de Sau, Girona',
  horario: 'Todos los días 9:00 – 20:00 (temporada)',
  latLng: [41.9830, 2.3909] as [number, number],
} as const;
