import type { ReactNode } from 'react';
import { BarChart3 } from 'lucide-react';

interface DashboardPageShellProps {
  title: string;
  subtitle: string;
  stripLabel: string;
  children: ReactNode;
  /** Barre d’actions à droite du titre (ex. bouton) */
  headerActions?: ReactNode;
  /** En-tête et marges plus compacts (ex. page Personnel) */
  compact?: boolean;
}

export function DashboardPageShell({
  title,
  subtitle,
  stripLabel,
  children,
  headerActions,
  compact = false,
}: DashboardPageShellProps) {
  return (
    <div className="dashboard-shell">
      <header
        className={`dashboard-hero flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between ${compact ? 'dashboard-hero--compact' : ''}`}
      >
        <div className="min-w-0">
          <h1
            className={`font-bold tracking-tight text-white ${compact ? 'text-base sm:text-lg' : 'text-lg sm:text-2xl'}`}
          >
            {title}
          </h1>
          <p className={`mt-0.5 text-white/75 ${compact ? 'text-xs' : 'text-xs sm:text-sm'}`}>{subtitle}</p>
        </div>
        {headerActions ? <div className="flex w-full min-w-0 flex-wrap gap-2 sm:w-auto sm:shrink-0">{headerActions}</div> : null}
      </header>

      <div className={`dashboard-strip ${compact ? 'dashboard-strip--compact' : ''}`}>
        <BarChart3 className={`shrink-0 text-amber-300 ${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
        <span>{stripLabel}</span>
      </div>

      <div className={compact ? 'space-y-4 p-3 sm:p-4' : 'space-y-5 p-3 sm:space-y-6 sm:p-6'}>{children}</div>
    </div>
  );
}
