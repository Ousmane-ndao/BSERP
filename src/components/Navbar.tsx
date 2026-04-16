import { LogOut, Bell, Settings } from 'lucide-react';
import { useAuth, ROLE_LABELS } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;
  const safeName = user.name || 'Utilisateur';

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6 sticky top-0 z-10">
      <div />
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => navigate('/parametres')}>
          <Settings size={18} />
        </Button>
        <div className="h-6 w-px bg-border" />
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xs font-bold text-primary">
              {safeName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </span>
          </div>
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium leading-none">{safeName}</p>
            <p className="text-xs text-muted-foreground">{ROLE_LABELS[user.role] ?? ROLE_LABELS.accueil}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => void logout()} title="Déconnexion">
            <LogOut size={16} />
          </Button>
        </div>
      </div>
    </header>
  );
}
