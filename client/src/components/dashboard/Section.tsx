import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { fadeUp, revealViewport } from './motion';

// ─── Section ──────────────────────────────────────────────────────────────────
// Consistent titled block used to group the dashboard into scannable sections.
// Animates into view once, giving the page a calm, staged reveal.

interface SectionProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  /** Right-aligned actions (buttons, badges, filters). */
  action?: ReactNode;
  /** Tailwind column-span helpers when placed on the 12-col grid. */
  className?: string;
  /** Remove the default vertical spacing between header and body. */
  bodyClassName?: string;
  children: ReactNode;
}

export const Section = ({
  title,
  description,
  icon,
  action,
  className = '',
  bodyClassName = '',
  children,
}: SectionProps) => {
  return (
    <motion.section
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={revealViewport}
      className={className}
    >
      {(title || action) && (
        <div className="mb-4 flex items-end justify-between gap-4">
          <div className="min-w-0">
            {title && (
              <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                {icon && (
                  <span className="text-slate-400 dark:text-slate-500">{icon}</span>
                )}
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>
            )}
          </div>
          {action && <div className="flex flex-shrink-0 items-center gap-2">{action}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </motion.section>
  );
};

export default Section;
