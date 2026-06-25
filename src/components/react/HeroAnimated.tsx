import { motion, useReducedMotion } from 'framer-motion';
import { RESERVAS } from '../../config/reservas';

interface HeroAnimatedProps {
  title?: string;
  subtitle?: string;
}

const fadeSlideUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 80,
      damping: 18,
      delay,
    },
  }),
};

export default function HeroAnimated({
  title = 'Tu aventura empieza en el agua',
  subtitle = 'Kayak, hidropedales y barcas en plena naturaleza. El pantano te espera.',
}: HeroAnimatedProps) {
  const shouldReduce = useReducedMotion();

  if (shouldReduce) {
    return (
      <div className="hero-content">
        <div className="hero-tag">Actividades acuáticas</div>
        <h1 className="hero-title">{title}</h1>
        <p className="hero-subtitle">{subtitle}</p>
        <div className="hero-actions">
          <a
            href={RESERVAS.url}
            className="btn-reserve"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${RESERVAS.label} — abre en nueva pestaña`}
          >
            {RESERVAS.label}
          </a>
          <a href="/#actividades" className="btn-secondary">
            Ver actividades
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="hero-content">
      <motion.div
        className="hero-tag"
        variants={fadeSlideUp}
        initial="hidden"
        animate="visible"
        custom={0}
      >
        Actividades acuáticas
      </motion.div>

      <motion.h1
        className="hero-title"
        variants={fadeSlideUp}
        initial="hidden"
        animate="visible"
        custom={0.1}
      >
        {title}
      </motion.h1>

      <motion.p
        className="hero-subtitle"
        variants={fadeSlideUp}
        initial="hidden"
        animate="visible"
        custom={0.2}
      >
        {subtitle}
      </motion.p>

      <motion.div
        className="hero-actions"
        variants={fadeSlideUp}
        initial="hidden"
        animate="visible"
        custom={0.3}
      >
        <a
          href={RESERVAS.url}
          className="btn-reserve"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${RESERVAS.label} — abre en nueva pestaña`}
        >
          {RESERVAS.label}
        </a>
        <a href="/#actividades" className="btn-secondary">
          Ver actividades
        </a>
      </motion.div>
    </div>
  );
}
