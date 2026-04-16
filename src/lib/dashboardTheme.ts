/** Palette commune des vues « tableau de bord » (métriques + graphiques) */
export const DASH_GREEN = '#10b981';
export const DASH_CORAL = '#f87171';
export const DASH_BLUE = '#3b82f6';
export const DASH_ORANGE = '#e46a4d';
export const DASH_PURPLE = '#6366f1';
export const DASH_AMBER = '#fbbf24';

/**
 * Couleurs en dur (hors Tailwind) pour éviter les cartes « vides » si les classes
 * dynamiques (spread) ne sont pas incluses dans le build CSS.
 */
export const DASH_METRIC_STYLES = {
  green: { headerBg: '#10b981', bodyBg: 'rgba(16, 185, 129, 0.12)' },
  coral: { headerBg: '#f87171', bodyBg: 'rgba(248, 113, 113, 0.12)' },
  blue: { headerBg: '#3b82f6', bodyBg: 'rgba(59, 130, 246, 0.12)' },
  orange: { headerBg: '#e46a4d', bodyBg: 'rgba(228, 106, 77, 0.12)' },
  purple: { headerBg: '#6366f1', bodyBg: 'rgba(99, 102, 241, 0.12)' },
  /** Fond suffisamment contrasté pour le texte blanc */
  amber: { headerBg: '#d97706', bodyBg: 'rgba(251, 191, 36, 0.18)' },
} as const;
