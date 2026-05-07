import type { LucideIcon } from 'lucide-react';

export interface DashboardMetricSpec {
  label: string;
  value: string;
  icon: LucideIcon;
  headerBg: string;
  bodyBg: string;
  loading?: boolean;
}

export function DashboardMetricCard({ label, value, icon: Icon, headerBg, bodyBg, loading }: DashboardMetricSpec) {
  if (loading) {
    return (
      <div className="dashboard-metric-card animate-pulse">
        <div className="dashboard-metric-head bg-slate-200 h-10" />
        <div className="dashboard-metric-body bg-slate-50 h-16" />
      </div>
    );
  }

  return (
    <div className="dashboard-metric-card">
      <div
        className="dashboard-metric-head text-white"
        style={{ backgroundColor: headerBg }}
      >
        <Icon className="h-5 w-5 shrink-0 opacity-95" strokeWidth={2} />
        <span>{label}</span>
      </div>
      <div className="dashboard-metric-body" style={{ backgroundColor: bodyBg }}>
        <p className="text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      </div>
    </div>
  );
}
