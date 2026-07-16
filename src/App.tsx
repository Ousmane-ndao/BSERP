import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LOGIN_ROUTE } from "@/lib/routes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Clients from "@/pages/Clients";
import DossierEtudiant from "@/pages/DossierEtudiant";
import Dossiers from "@/pages/Dossiers";
import Documents from "@/pages/Documents";
import DocumentsClient from "@/pages/DocumentsClient";
import MonDossier from "@/pages/MonDossier";
import Comptabilite from "@/pages/Comptabilite";
import Personnel from "@/pages/Personnel";
import Parametres from "@/pages/Parametres";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // Les données sont considérées comme "fraîches" pendant 2 minutes
      gcTime: 10 * 60 * 1000,   // Les données restent en cache pendant 10 minutes
      retry: 1,                 // Réessayer une fois en cas d'échec
      refetchOnWindowFocus: false, // Ne pas recharger quand on revient sur l'onglet
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path={LOGIN_ROUTE} element={<Login />} />
            <Route path="/login" element={<Navigate to={LOGIN_ROUTE} replace />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/clients/:clientId/dossier-etudiant" element={<DossierEtudiant />} />
              <Route path="/dossiers" element={<Dossiers />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/documents/client/:clientId" element={<DocumentsClient />} />
              <Route path="/mon-dossier" element={<MonDossier />} />
              <Route path="/comptabilite" element={<Comptabilite />} />
              <Route path="/personnel" element={<Personnel />} />
              <Route path="/parametres" element={<Parametres />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
