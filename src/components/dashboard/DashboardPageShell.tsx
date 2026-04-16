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
    <div className="dashboard-shell overflow-hidden">
      <header
        className={`dashboard-hero flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3 ${compact ? 'dashboard-hero--compact' : ''}`}
      >
        <div>
          <h1
            className={`font-bold tracking-tight text-white ${compact ? 'text-base sm:text-lg' : 'text-xl sm:text-2xl'}`}
          >
            {title}
          </h1>
          <p className={`mt-0.5 text-white/75 ${compact ? 'text-xs' : 'text-sm'}`}>{subtitle}</p>
        </div>
        {headerActions ? <div className="shrink-0">{headerActions}</div> : null}
      </header>

      <div className={`dashboard-strip ${compact ? 'dashboard-strip--compact' : ''}`}>
        <BarChart3 className={`shrink-0 text-amber-300 ${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
        <span>{stripLabel}</span>
      </div>

      <div className={compact ? 'space-y-4 p-3 sm:p-4' : 'space-y-6 p-4 sm:p-6'}>{children}</div>
    </div>
  );
}
