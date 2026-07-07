/**
 * Catálogo real de actividades acuáticas de Lacwake (reservas.lacwake.es).
 * 11 actividades agrupadas por familia para la home rediseñada (CIBA-2173).
 *
 * Cada tarjeta es visible y enlazable:
 *  - `href`  → página informativa interna cuando existe, o el sistema de
 *              reservas (reservas.lacwake.es) para las que aún no tienen ficha.
 *  - Botón "Reservar" → WhatsApp con mensaje prefijado por actividad (ver waLink).
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
  /** Enlace "Ver más" — ficha interna o reservas.lacwake.es. */
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

const RESERVAS_URL = 'https://reservas.lacwake.es';
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
        href: RESERVAS_URL,
      },
      {
        slug: 'wakesurf',
        name: 'Wakesurf',
        blurb: 'Surfea la ola de la lancha sin cuerda. Fluido, técnico y adictivo.',
        tag: 'Técnico',
        image: `${IMG}/wakesurf.webp`,
        imageAlt: 'Wakesurfista deslizándose sobre la ola de la lancha en el pantano de la Baells',
        href: RESERVAS_URL,
      },
      {
        slug: 'wakeskate',
        name: 'Wakeskate',
        blurb: 'La tabla suelta, tú al mando. Skate sobre agua para los más atrevidos.',
        tag: 'Avanzado',
        image: `${IMG}/wakeskate.webp`,
        imageAlt: 'Rider de wakeskate maniobrando sobre el agua tras la lancha',
        href: RESERVAS_URL,
      },
      {
        slug: 'esqui-nautico',
        name: 'Esquí Náutico',
        blurb: 'El clásico que nunca falla. Dos esquís, velocidad y pura diversión.',
        tag: 'Clásico',
        image: `${IMG}/esqui-nautico.webp`,
        imageAlt: 'Esquiador náutico deslizándose sobre el pantano de la Baells con estela de agua',
        href: RESERVAS_URL,
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
        href: '/actividades/sup',
      },
      {
        slug: 'barca-motor',
        name: 'Barca a motor',
        blurb: 'Toma el timón y explora el pantano a tu aire. Sin licencia, con briefing.',
        tag: 'A tu aire',
        image: `${IMG}/barca-motor.webp`,
        imageAlt: 'Barca a motor navegando por el pantano de la Baells rodeada de montañas',
        href: '/actividades/barcas',
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
        href: '/actividades/barcas',
      },
    ],
  },
];

/** Total de actividades del catálogo (para titulares). */
export const ACTIVITY_COUNT = ACTIVITY_FAMILIES.reduce(
  (n, f) => n + f.activities.length,
  0,
);

/**
 * Construye un enlace de WhatsApp con mensaje prefijado por actividad,
 * reutilizando el número del `whatsappUrl` del CMS/siteConfig.
 * Si no puede extraer el número, devuelve la URL base tal cual.
 */
export function waLink(baseWhatsappUrl: string, activityName: string): string {
  const match = baseWhatsappUrl.match(/(?:wa\.me\/|phone=)(\d+)/);
  const text = encodeURIComponent(
    `Hola, quiero reservar ${activityName} en Lacwake 🌊`,
  );
  if (!match) return baseWhatsappUrl;
  return `https://wa.me/${match[1]}?text=${text}`;
}
