import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutProvider, useLayout } from '@/contexts/LayoutContext';
import { LOGIN_ROUTE } from '@/lib/routes';
import AppSidebar from './AppSidebar';
import Navbar from './Navbar';

function AuthenticatedShell() {
  const { collapsed } = useLayout();

  return (
    <div className="min-h-dvh w-full max-w-[100vw] overflow-x-hidden bg-[hsl(220_14%_96%)]">
      <AppSidebar />
      <div
        className={`flex min-h-dvh min-w-0 flex-col transition-[padding] duration-200 ${
          collapsed ? 'lg:pl-[4.5rem]' : 'lg:pl-72'
        }`}
      >
        <Navbar />
        <main className="min-w-0 flex-1 px-3 pb-8 pt-[4.25rem] sm:px-5 lg:px-8 lg:pt-[4.5rem]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function AppLayout() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Navigate to={LOGIN_ROUTE} replace />;

  return (
    <LayoutProvider>
      <AuthenticatedShell />
    </LayoutProvider>
  );
}
