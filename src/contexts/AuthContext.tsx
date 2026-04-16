import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { authApi } from '@/services/api';

export type Role =
  | 'directrice'
  | 'responsable_admin'
  | 'conseillere_pedagogique'
  | 'informaticien'
  | 'comptable'
  | 'commercial'
  | 'accueil';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** Téléphone (table employés), renvoyé par l’API */
  telephone?: string | null;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasAccess: (allowedRoles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Role-based menu access config
export const ROLE_ACCESS: Record<Role, string[]> = {
  directrice: ['dashboard', 'clients', 'dossiers', 'documents', 'comptabilite', 'personnel'],
  responsable_admin: ['dashboard', 'clients', 'dossiers', 'documents', 'comptabilite', 'personnel'],
  conseillere_pedagogique: ['dashboard', 'clients', 'dossiers', 'documents'],
  informaticien: ['dashboard', 'clients', 'dossiers', 'documents', 'comptabilite', 'personnel'],
  comptable: ['dashboard', 'clients', 'comptabilite'],
  commercial: ['dashboard', 'clients', 'dossiers'],
  accueil: ['dashboard', 'clients', 'dossiers'],
};

export const ROLE_LABELS: Record<Role, string> = {
  directrice: 'Directrice',
  responsable_admin: 'Resp. Administrative',
  conseillere_pedagogique: 'Conseillère Pédagogique',
  informaticien: 'Informaticien',
  comptable: 'Comptable',
  commercial: 'Commercial',
  accueil: 'Accueil Client',
};

function normalizeRole(input: unknown): Role {
  const value = String(input ?? '').trim().toLowerCase();
  const map: Record<string, Role> = {
    directrice: 'directrice',
    'responsable administrative': 'responsable_admin',
    responsable_admin: 'responsable_admin',
    'conseillère pédagogique': 'conseillere_pedagogique',
    'conseillere pedagogique': 'conseillere_pedagogique',
    conseillere_pedagogique: 'conseillere_pedagogique',
    informaticien: 'informaticien',
    comptable: 'comptable',
    commercial: 'commercial',
    'accueil client': 'accueil',
    accueil: 'accueil',
  };

  return map[value] ?? 'accueil';
}

function normalizeUser(input: unknown): User | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  const name = String(raw.name ?? '').trim();
  const email = String(raw.email ?? '').trim();

  if (!name || !email) return null;

  const tel = raw.telephone;
  const telephone =
    tel === null || tel === undefined ? undefined : String(tel).trim() || undefined;

  return {
    id: String(raw.id ?? ''),
    name,
    email,
    telephone,
    role: normalizeRole(raw.role),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('bserp_user');
    return stored ? normalizeUser(JSON.parse(stored)) : null;
  });

  const refreshUser = useCallback(async () => {
    const res = await authApi.me();
    const currentUser = normalizeUser(res.data);
    if (!currentUser) throw new Error('Utilisateur invalide');
    setUser(currentUser);
    localStorage.setItem('bserp_user', JSON.stringify(currentUser));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    const token = response.data?.token as string | undefined;
    const apiUser = normalizeUser(response.data?.user);

    if (!token || !apiUser) {
      throw new Error('Réponse de connexion invalide');
    }

    localStorage.setItem('bserp_token', token);
    localStorage.setItem('bserp_user', JSON.stringify(apiUser));
    setUser(apiUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Nettoyer la session locale même si l'API échoue.
    } finally {
      localStorage.removeItem('bserp_token');
      localStorage.removeItem('bserp_user');
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('bserp_token');
    if (!token) return;

    void refreshUser()
      .catch(() => {
        localStorage.removeItem('bserp_token');
        localStorage.removeItem('bserp_user');
        setUser(null);
      });
  }, [refreshUser]);

  const hasAccess = useCallback(
    (allowedRoles: Role[]) => {
      if (!user) return false;
      return allowedRoles.includes(user.role);
    },
    [user]
  );

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, refreshUser, hasAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
