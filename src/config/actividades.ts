/**
 * Catálogo real de actividades acuáticas de Lacwake.
 * 11 actividades agrupadas por familia para la home rediseñada (CIBA-2173).
 *
 * Cada tarjeta es visible y enlazable:
 *  - `href`  → página informativa interna de la actividad (`/actividades/*`).
 *              Ninguna card enlaza al subdominio de reservas (CIBA-2345).
 *  - Botón "Reservar" → WhatsApp con mensaje prefijado por actividad (ver waLink).
 *
 * Este catálogo es la SEMILLA/fallback: las cards pueden pilotarse desde la key
 * `home` del CMS (ver `getHomeContent` en lib/cms). Sin CMS, la home se ve idéntica.
 *
 * Las imágenes son los assets generados por el Designer (CIBA-2172) en
 * public/assets/redesign/ — WebP 16:9, estética cinematográfica coherente.
 */

export interface Activity {
  slug: string;
  name: string;
  /** Frase corta de venta, sin texto incrustado en la imagen. */
  blurb: string;
  /** Etiqueta corta (familia / carácter) para el chip de la tarjeta. */
  tag: string;
  image: string;
  imageAlt: string;
  /** Enlace "Ver más" — ficha interna `/actividades/*`. */
  href: string;
}

export interface ActivityFamily {
  id: string;
  /** Índice mostrado como número grande (estética moderna/brutal). */
  index: string;
  label: string;
  /** Titular de la familia. */
  title: string;
  /** Subtítulo descriptivo. */
  description: string;
  activities: Activity[];
}

const IMG = '/assets/redesign';

export const ACTIVITY_FAMILIES: ActivityFamily[] = [
  {
    id: 'kayak',
    index: '01',
    label: 'Familia Kayak',
    title: 'Rema a tu ritmo',
    description:
      'Recorre las aguas turquesa del pantano de la Baells en kayak, solo, en pareja o en grupo. La forma más pura de sentir el agua.',
    activities: [
      {
        slug: 'kayak-individual',
        name: 'Kayak Individual',
        blurb: 'Tú, el remo y el pantano. Libertad total para explorar cada rincón a tu aire.',
        tag: 'Individual',
        image: `${IMG}/kayak-individual.webp`,
        imageAlt: 'Kayak individual sobre las aguas turquesa del pantano de la Baells al atardecer',
        href: '/actividades/kayak',
      },
      {
        slug: 'kayak-doble',
        name: 'Kayak Doble',
        blurb: 'Rema en pareja y comparte la aventura. Coordinación, risas y paisaje.',
        tag: 'En pareja',
        image: `${IMG}/kayak-doble.webp`,
        imageAlt: 'Kayak doble navegando por el pantano de la Baells con el viaducto al fondo',
        href: '/actividades/kayak',
      },
      {
        slug: 'kayak-triple',
        name: 'Kayak Triple',
        blurb: 'El plan familiar por excelencia. Tres plazas para no dejar a nadie en tierra.',
        tag: 'Familiar',
        image: `${IMG}/kayak-triple.webp`,
        imageAlt: 'Kayak triple familiar en las aguas del pantano de la Baells',
        href: '/actividades/kayak',
      },
    ],
  },
  {
    id: 'wake',
    index: '02',
    label: 'Wake & Esquí',
    title: 'Adrenalina sobre el agua',
    description:
      'Deportes de tabla y velocidad tras la lancha. Golden hour, spray y máxima intensidad para los que buscan emoción.',
    activities: [
      {
        slug: 'wakeboard',
        name: 'Wakeboard',
        blurb: 'Salta la estela con la tabla anclada. El deporte estrella de Lacwake.',
        tag: 'Intenso',
        image: `${IMG}/wakeboard.webp`,
        imageAlt: 'Rider de wakeboard saltando la estela de la lancha con spray de agua a contraluz',
        href: '/actividades/wakeboard',
      },
      {
        slug: 'wakesurf',
        name: 'Wakesurf',
        blurb: 'Surfea la ola de la lancha sin cuerda. Fluido, técnico y adictivo.',
        tag: 'Técnico',
        image: `${IMG}/wakesurf.webp`,
        imageAlt: 'Wakesurfista deslizándose sobre la ola de la lancha en el pantano de la Baells',
        href: '/actividades/wakesurf',
      },
      {
        slug: 'wakeskate',
        name: 'Wakeskate',
        blurb: 'La tabla suelta, tú al mando. Skate sobre agua para los más atrevidos.',
        tag: 'Avanzado',
        image: `${IMG}/wakeskate.webp`,
        imageAlt: 'Rider de wakeskate maniobrando sobre el agua tras la lancha',
        href: '/actividades/wakeskate',
      },
      {
        slug: 'esqui-nautico',
        name: 'Esquí Náutico',
        blurb: 'El clásico que nunca falla. Dos esquís, velocidad y pura diversión.',
        tag: 'Clásico',
        image: `${IMG}/esqui-nautico.webp`,
        imageAlt: 'Esquiador náutico deslizándose sobre el pantano de la Baells con estela de agua',
        href: '/actividades/esqui-nautico',
      },
    ],
  },
  {
    id: 'paseos',
    index: '03',
    label: 'Paseos & Paddle',
    title: 'Navega sin prisa',
    description:
      'Planes tranquilos para disfrutar del entorno en familia: barca, hidropedal, paseos guiados y paddle surf sobre aguas en calma.',
    activities: [
      {
        slug: 'paddle-surf',
        name: 'Paddle Surf',
        blurb: 'De pie sobre la tabla, remando en calma. Equilibrio y paz sobre el agua.',
        tag: 'Relajado',
        image: `${IMG}/paddle-surf.webp`,
        imageAlt: 'Persona practicando paddle surf de pie sobre aguas tranquilas del pantano',
        // Slug canónico `paddle-surf` (CIBA-2522): la ruta dinámica redirige
        // el legacy `/actividades/sup` con 301 a esta URL.
        href: '/actividades/paddle-surf',
      },
      {
        slug: 'barca-motor',
        name: 'Barca a motor',
        blurb: 'Toma el timón y explora el pantano a tu aire. Sin licencia, con briefing.',
        tag: 'A tu aire',
        image: `${IMG}/barca-motor.webp`,
        imageAlt: 'Barca a motor navegando por el pantano de la Baells rodeada de montañas',
        href: '/actividades/barca-motor',
      },
      {
        slug: 'hidropedal',
        name: 'Hidropedal',
        blurb: 'Pedalea sobre el agua con toda la familia. El plan más divertido para los peques.',
        tag: 'Familiar',
        image: `${IMG}/hidropedal.webp`,
        imageAlt: 'Familia disfrutando de un hidropedal en el pantano de la Baells',
        href: '/actividades/hidropedales',
      },
      {
        slug: 'paseos-barco',
        name: 'Paseos en barco',
        blurb: 'Déjate llevar. Un recorrido guiado por los rincones más bonitos del pantano.',
        tag: 'Guiado',
        image: `${IMG}/paseos-barco.webp`,
        imageAlt: 'Paseo en barco por el pantano de la Baells con el viaducto de la C-16 al fondo',
        href: '/actividades/paseos-barco',
      },
    ],
  },
];

/**
 * Construye un enlace de WhatsApp con mensaje prefijado por actividad,
 * reutilizando el número del `whatsappUrl` del CMS/siteConfig.
 *
 * `customMessage` (opcional) permite al Board sobrescribir el texto por card
 * desde la key `home` del CMS (`cta_whatsapp_message`, CIBA-2345). Si se omite,
 * se usa la plantilla por defecto por actividad.
 *
 * Si no puede extraer el número, devuelve la URL base tal cual.
 */
export function waLink(
  baseWhatsappUrl: string,
  activityName: string,
  customMessage?: string,
): string {
  const match = baseWhatsappUrl.match(/(?:wa\.me\/|phone=)(\d+)/);
  const message =
    customMessage && customMessage.trim() !== ''
      ? customMessage.trim()
      : `Hola, quiero reservar ${activityName} en Lacwake 🌊`;
  if (!match) return baseWhatsappUrl;
  return `https://wa.me/${match[1]}?text=${encodeURIComponent(message)}`;
}
