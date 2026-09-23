import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  BarChart3,
  Eye,
  EyeOff,
  FileText,
  FolderOpen,
  Lock,
  Mail,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { DualBrandLockup, ProductTitle } from '@/components/brand/DualBrandLockup';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const BRAND_BLUE = '#005DA4';
const BRAND_ORANGE = '#F4811F';

function loginErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const data = err.response?.data as { message?: string } | undefined;
    const msg = data?.message?.trim();
    if (status === 401) {
      return msg || 'Identifiants incorrects (e-mail ou mot de passe).';
    }
    if (status === 422) {
      return msg || 'Données invalides.';
    }
    if (!err.response) {
      return "Impossible de joindre l'API. Vérifiez que le serveur Laravel est démarré.";
    }
    return msg || `Erreur serveur (${status}).`;
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return 'Connexion impossible.';
}

function LoginHeroPanel() {
  const features = [
    { icon: Users, label: 'Équipe BS-Consulting' },
    { icon: FolderOpen, label: 'Dossiers clients' },
    { icon: FileText, label: 'Documents' },
    { icon: BarChart3, label: 'Rapports' },
  ];

  return (
    <aside className="relative isolate flex min-h-[300px] w-full flex-col justify-center overflow-hidden px-6 py-8 text-white lg:min-h-screen lg:w-[48%] lg:px-10 lg:py-10">
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(165deg, #06325f 0%, #0a4d93 48%, #082f58 100%)' }}
      />
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <pattern id="login-dots" width="18" height="18" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="1" fill="white" opacity="0.16" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#login-dots)" />
        <path
          d="M-20 640 C 180 560, 360 720, 620 600 S 980 520, 1280 640"
          fill="none"
          stroke="#F6A04D"
          strokeWidth="2.5"
          opacity="0.85"
        />
      </svg>

      <div className="relative z-10 max-w-lg">
        <DualBrandLockup variant="light" />
        <ProductTitle light className="mt-5 text-2xl leading-tight sm:text-3xl" />
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/85">
          Espace réservé à l’équipe BS-Consulting : clients, dossiers et documents.
        </p>
        <ul className="mt-5 space-y-2.5">
          {features.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-2.5 text-sm font-medium text-white/95">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/12 backdrop-blur-sm">
                <Icon className="h-3.5 w-3.5" strokeWidth={2} />
              </span>
              {label}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/');
    } catch (err) {
      setError(loginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-white lg:flex-row">
      <LoginHeroPanel />

      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-8 lg:w-[52%] lg:px-8">
        <div
          className="pointer-events-none absolute -right-10 -top-24 h-72 w-80 rounded-full"
          style={{ background: `linear-gradient(135deg, ${BRAND_ORANGE}, #ffb347)` }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-20 -top-16 h-48 w-56 rounded-full opacity-90"
          style={{ background: BRAND_BLUE }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 -right-10 h-56 w-64 rounded-full opacity-80"
          style={{ background: `linear-gradient(135deg, ${BRAND_BLUE}, #1a7fd4)` }}
          aria-hidden
        />

        <div className="relative z-10 w-full max-w-[360px] rounded-2xl bg-white p-6 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.28)] sm:p-7">
          <div className="flex flex-col items-center text-center">
            <DualBrandLockup className="mb-3" />
            <ProductTitle className="text-lg sm:text-xl" />
            <p className="mt-1 text-xs text-slate-500">Plateforme interne — équipe BS-Consulting</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            <div>
              <h1 className="text-base font-semibold text-slate-900">Connexion</h1>
              <p className="text-xs text-slate-500">Accès réservé à l’équipe BS-Consulting.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                Email professionnel
              </Label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="votre.nom@bsconsulting.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-10 rounded-xl border-slate-200 bg-white pl-10 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:border-[#005DA4]/50 focus-visible:ring-[#005DA4]/25"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Mot de passe
                </Label>
                <button
                  type="button"
                  className="text-xs font-medium text-[#005DA4] hover:underline"
                  onClick={() =>
                    setInfo('Contactez l’équipe BS-Consulting pour réinitialiser votre mot de passe.')
                  }
                >
                  Mot de passe oublié ?
                </button>
              </div>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Entrez votre mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-10 rounded-xl border-slate-200 bg-white pl-10 pr-12 text-sm text-slate-900 shadow-sm focus-visible:border-[#005DA4]/50 focus-visible:ring-[#005DA4]/25"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}
            {info && !error && (
              <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">{info}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="h-10 w-full gap-2 rounded-full border-0 text-sm font-semibold text-white shadow-md disabled:opacity-60"
              style={{
                background: `linear-gradient(90deg, #0b4f8a 0%, ${BRAND_BLUE} 42%, ${BRAND_ORANGE} 100%)`,
              }}
            >
              <Lock className="h-4 w-4" />
              {loading ? 'Connexion…' : 'Se connecter'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5 text-[#005DA4]" />
              Accès sécurisé — équipe BS-Consulting
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">Vos informations sont protégées.</p>
            <p className="mt-2 text-[11px] text-slate-400">
              © {new Date().getFullYear()} BS-Consulting — Tous droits réservés
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
