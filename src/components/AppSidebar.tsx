import {
  LayoutDashboard,
  Users,
  FolderOpen,
  FileText,
  DollarSign,
  UserCog,
  Settings,
  ChevronLeft,
  Menu,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth, ROLE_ACCESS } from '@/contexts/AuthContext';
import { useState } from 'react';

const menuItems = [
  { key: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, path: '/' },
  { key: 'clients', label: 'Clients', icon: Users, path: '/clients' },
  { key: 'dossiers', label: 'Dossiers', icon: FolderOpen, path: '/dossiers' },
  { key: 'documents', label: 'Documents', icon: FileText, path: '/documents' },
  { key: 'comptabilite', label: 'Comptabilité', icon: DollarSign, path: '/comptabilite' },
  { key: 'personnel', label: 'Personnel', icon: UserCog, path: '/personnel' },
  { key: 'parametres', label: 'Paramètres', icon: Settings, path: '/parametres' },
];

export default function AppSidebar() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  if (!user) return null;

  const allowedKeys = [...(ROLE_ACCESS[user.role] ?? ROLE_ACCESS.accueil), 'parametres'];
  const visibleItems = menuItems.filter((item) => allowedKeys.includes(item.key));

  return (
    <aside
      className={`flex h-screen flex-col bg-sidebar text-sidebar-foreground sticky top-0 transition-all duration-200 ${
        collapsed ? 'w-20' : 'w-72'
      }`}
    >
      {/* Header */}
      <div className="flex h-20 items-center justify-between border-b border-sidebar-border bg-[#12202e] px-4">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <img
              src="/brand-bs-consulting-dark.png"
              alt="BS-Consulting"
              className="h-10 w-auto object-contain"
            />
            <span className="text-xl font-bold tracking-tight">BSERP</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-sidebar-accent transition-colors text-sidebar-foreground/70 hover:text-sidebar-foreground"
        >
          {collapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.key}
              onClick={() => navigate(item.path)}
              className={`sidebar-link w-full ${active ? 'sidebar-link-active' : 'sidebar-link-inactive'}`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={20} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
