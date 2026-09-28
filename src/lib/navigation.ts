import {
  LayoutDashboard,
  Users,
  FolderOpen,
  FileText,
  FolderHeart,
  DollarSign,
  UserCog,
  Settings,
} from 'lucide-react';

export const APP_MENU_ITEMS = [
  { key: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, path: '/' },
  { key: 'clients', label: 'Clients', icon: Users, path: '/clients' },
  { key: 'dossiers', label: 'Dossiers', icon: FolderOpen, path: '/dossiers' },
  { key: 'documents', label: 'Documents', icon: FileText, path: '/documents' },
  { key: 'mon_dossier', label: 'Mon dossier', icon: FolderHeart, path: '/mon-dossier' },
  { key: 'comptabilite', label: 'Comptabilité', icon: DollarSign, path: '/comptabilite' },
  { key: 'personnel', label: 'Personnel', icon: UserCog, path: '/personnel' },
  { key: 'parametres', label: 'Paramètres', icon: Settings, path: '/parametres' },
] as const;

export function pageTitleFromPath(pathname: string): string {
  if (pathname === '/') return 'Tableau de bord';
  if (pathname.startsWith('/clients') && pathname.includes('dossier-etudiant')) return 'Dossier étudiant';
  if (pathname.startsWith('/clients') && pathname.includes('payments')) return 'Paiements';
  if (pathname.startsWith('/documents/client')) return 'Documents client';
  const found = APP_MENU_ITEMS.find((item) => item.path !== '/' && pathname.startsWith(item.path));
  return found?.label ?? 'bserviceconsulting';
}
