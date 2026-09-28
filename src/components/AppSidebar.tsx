import { ChevronLeft, Menu, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DualBrandLockup } from '@/components/brand/DualBrandLockup';
import { useAuth, ROLE_ACCESS } from '@/contexts/AuthContext';
import { useLayout } from '@/contexts/LayoutContext';
import { APP_MENU_ITEMS } from '@/lib/navigation';

function NavButtons({
  collapsed,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate: (path: string) => void;
}) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return null;
  const allowedKeys = [...(ROLE_ACCESS[user.role] ?? ROLE_ACCESS.accueil), 'parametres'];
  const visibleItems = APP_MENU_ITEMS.filter((item) => allowedKeys.includes(item.key));

  return (
    <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-2 py-3">
      {visibleItems.map((item) => {
        const active =
          location.pathname === item.path ||
          (item.path === '/mon-dossier' && location.pathname.startsWith('/mon-dossier'));
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onNavigate(item.path)}
            className={`sidebar-link w-full ${collapsed ? 'justify-center px-0' : ''} ${
              active ? 'sidebar-link-active' : 'sidebar-link-inactive'
            }`}
            title={item.label}
          >
            <item.icon size={20} className="shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </button>
        );
      })}
    </nav>
  );
}

export default function AppSidebar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { collapsed, setCollapsed, mobileNavOpen, closeMobileNav } = useLayout();

  if (!user) return null;

  const go = (path: string) => {
    navigate(path);
    closeMobileNav();
  };

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden h-dvh flex-col bg-sidebar text-sidebar-foreground shadow-xl transition-[width] duration-200 lg:flex ${
          collapsed ? 'w-[4.5rem]' : 'w-72'
        }`}
      >
        <div
          className={`flex h-14 shrink-0 items-center border-b border-sidebar-border bg-[#12202e] ${
            collapsed ? 'justify-center px-1' : 'justify-between px-3'
          }`}
        >
          {!collapsed && (
            <div className="min-w-0 flex-1 pr-1">
              <DualBrandLockup variant="light" size="sm" />
              <span className="mt-0.5 block truncate text-[11px] font-semibold tracking-tight text-white/90">
                BS Service Consulting
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            aria-label={collapsed ? 'Agrandir le menu' : 'Réduire le menu'}
          >
            {collapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
        <NavButtons collapsed={collapsed} onNavigate={go} />
      </aside>

      {mobileNavOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px] lg:hidden"
          aria-label="Fermer le menu"
          onClick={closeMobileNav}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-[min(18.5rem,88vw)] flex-col bg-sidebar text-sidebar-foreground shadow-2xl transition-transform duration-300 ease-out lg:hidden ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        }`}
        aria-hidden={!mobileNavOpen}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-sidebar-border bg-[#12202e] px-3">
          <div className="min-w-0">
            <DualBrandLockup variant="light" size="sm" />
            <p className="mt-0.5 truncate text-[11px] font-semibold text-white/90">BS Service Consulting</p>
          </div>
          <button
            type="button"
            onClick={closeMobileNav}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-white/80 hover:bg-white/10"
            aria-label="Fermer le menu"
          >
            <X size={20} />
          </button>
        </div>
        <NavButtons onNavigate={go} />
      </aside>
    </>
  );
}
