import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LOGIN_ROUTE } from '@/lib/routes';
import AppSidebar from './AppSidebar';
import Navbar from './Navbar';

export default function AppLayout() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Navigate to={LOGIN_ROUTE} replace />;

  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-auto">
        <Navbar />
        <main className="flex-1 bg-[hsl(220_14%_96%)] p-6 lg:p-8 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
