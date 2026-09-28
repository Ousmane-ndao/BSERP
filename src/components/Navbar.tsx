import { LogOut, Bell, Settings, Menu } from 'lucide-react';
import { useAuth, ROLE_LABELS } from '@/contexts/AuthContext';
import { useLayout } from '@/contexts/LayoutContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DualBrandLockup } from '@/components/brand/DualBrandLockup';
import { pageTitleFromPath } from '@/lib/navigation';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { collapsed, openMobileNav } = useLayout();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;
  const safeName = user.name || 'Utilisateur';
  const title = pageTitleFromPath(location.pathname);

  return (
    <header
      className={`fixed top-0 right-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-card/95 px-3 backdrop-blur-md transition-[left] duration-200 sm:px-4 lg:px-6 ${
        collapsed ? 'left-0 lg:left-[4.5rem]' : 'left-0 lg:left-72'
      }`}
    >
      <button
        type="button"
        onClick={openMobileNav}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-foreground hover:bg-muted lg:hidden"
        aria-label="Ouvrir le menu"
      >
        <Menu size={22} />
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <DualBrandLockup className="hidden h-7 max-w-[120px] sm:block lg:hidden" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{title}</p>
          <p className="hidden truncate text-[11px] text-muted-foreground sm:block lg:hidden">
            BS Service Consulting
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        <Button variant="ghost" size="icon" className="relative h-10 w-10" aria-label="Notifications">
          <Bell size={18} />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hidden h-10 w-10 sm:inline-flex"
          onClick={() => navigate('/parametres')}
          aria-label="Paramètres"
        >
          <Settings size={18} />
        </Button>
        <div className="mx-1 hidden h-6 w-px bg-border sm:block" />
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
            <span className="text-[11px] font-bold text-primary">
              {safeName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)}
            </span>
          </div>
          <div className="hidden text-right xl:block">
            <p className="max-w-[10rem] truncate text-sm font-medium leading-none">{safeName}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{ROLE_LABELS[user.role] ?? ROLE_LABELS.accueil}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            onClick={() => void logout()}
            title="Déconnexion"
            aria-label="Déconnexion"
          >
            <LogOut size={16} />
          </Button>
        </div>
      </div>
    </header>
  );
}
