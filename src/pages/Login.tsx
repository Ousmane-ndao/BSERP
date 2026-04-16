import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Clock, Lock, Mail, Settings, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const BRAND_BLUE = '#0066ad';
const BRAND_NAVY = '#0a192f';

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

/** Fichier image officiel (emblème + « -Consulting » italique) ; alt texte complet BS-Consulting. */
function BrandLockup({
  className,
  compact,
  src = '/bs-consulting-logo.svg',
}: {
  className?: string;
  compact?: boolean;
  src?: string;
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center',
        className,
      )}
    >
      <img
        src={src}
        alt="BS-Consulting"
        className={cn(
          'w-auto max-w-[min(100%,280px)] object-contain object-left',
          compact ? 'h-7 sm:h-8' : 'h-9 sm:h-11',
        )}
        decoding="async"
      />
    </div>
  );
}

/** Panneau gauche : dégradé bleu nuit, orbites, glassmorphism, aperçu tableau de bord */
function LoginHeroPanel() {
  const dot = (angleDeg: number, radiusPx: number, size: string, glow: string) => {
    const rad = (angleDeg * Math.PI) / 180;
    const x = Math.cos(rad) * radiusPx;
    const y = Math.sin(rad) * radiusPx;
    return (
      <span
        className={cn('absolute rounded-full', size, glow)}
        style={{
          left: `calc(50% + ${x}px)`,
          top: `calc(50% + ${y}px)`,
          transform: 'translate(-50%, -50%)',
        }}
        aria-hidden
      />
    );
  };

  return (
    <aside
      className="relative flex min-h-[420px] w-full flex-col items-center justify-center overflow-hidden px-6 py-12 lg:min-h-screen lg:w-1/2 lg:shrink-0 lg:py-16"
      style={{
        background: `radial-gradient(ellipse 85% 70% at 50% 45%, #1a3a62 0%, #122a4a 35%, ${BRAND_NAVY} 72%, #050a12 100%)`,
      }}
    >
      {/* Anneaux concentriques */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" aria-hidden>
        <div className="absolute left-1/2 top-1/2 h-[min(88vw,440px)] w-[min(88vw,440px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#6b8cff]/25" />
        <div className="absolute left-1/2 top-1/2 h-[min(70vw,340px)] w-[min(70vw,340px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#8b7fd9]/30" />
        <div className="absolute left-1/2 top-1/2 h-[min(52vw,260px)] w-[min(52vw,260px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#5c7cfa]/35" />
        <div className="absolute left-1/2 top-1/2 h-[min(36vw,180px)] w-[min(36vw,180px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
      </div>

      <div className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-0">
        {dot(12, 205, 'h-2 w-2', 'bg-[#a78bfa]/90 shadow-[0_0_12px_#a78bfa]')}
        {dot(68, 205, 'h-1.5 w-1.5', 'bg-[#60a5fa]/95 shadow-[0_0_10px_#60a5fa]')}
        {dot(135, 168, 'h-2 w-2', 'bg-[#818cf8]/90 shadow-[0_0_12px_#818cf8]')}
        {dot(205, 220, 'h-1.5 w-1.5', 'bg-[#c084fc]/90 shadow-[0_0_10px_#c084fc]')}
        {dot(280, 195, 'h-2 w-2', 'bg-[#38bdf8]/90 shadow-[0_0_12px_#38bdf8]')}
        {dot(320, 150, 'h-1.5 w-1.5', 'bg-[#a5b4fc]/90 shadow-[0_0_10px_#a5b4fc]')}
      </div>

      {/* Icônes flottantes type verre */}
      <div
        className="pointer-events-none absolute left-[14%] top-[22%] flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white/80 shadow-lg backdrop-blur-md"
        aria-hidden
      >
        <Settings className="h-5 w-5" strokeWidth={1.5} />
      </div>
      <div
        className="pointer-events-none absolute right-[16%] top-[30%] flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white/75 shadow-lg backdrop-blur-md"
        aria-hidden
      >
        <Clock className="h-4 w-4" strokeWidth={1.5} />
      </div>
      <div
        className="pointer-events-none absolute bottom-[28%] left-[18%] flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white/75 shadow-lg backdrop-blur-md"
        aria-hidden
      >
        <User className="h-4 w-4" strokeWidth={1.5} />
      </div>

      {/* Carte glass centrale */}
      <div className="relative z-10 w-full max-w-[340px] rounded-2xl border border-white/25 bg-white/[0.12] p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.45)] backdrop-blur-[28px] supports-[backdrop-filter]:bg-white/10">
        <div className="mb-4 flex flex-col items-center text-center">
          <BrandLockup
            compact
            src="/bs-consulting-logo.svg"
            className="mb-3"
          />
          <p className="text-sm font-semibold text-white">Bon retour</p>
          <div className="mt-3 h-px w-full max-w-[200px] bg-gradient-to-r from-transparent via-white/35 to-transparent" />
          <div
            className="mt-3 h-8 w-[min(200px,55%)] rounded-full shadow-md"
            style={{ background: `linear-gradient(180deg, ${BRAND_BLUE} 0%, #004a8c 100%)` }}
            aria-hidden
          />
        </div>

        <div
          className="mb-5 h-2.5 w-full overflow-hidden rounded-full shadow-inner"
          style={{
            background: 'linear-gradient(90deg, #ef4444, #f97316, #eab308, #22c55e, #3b82f6, #8b5cf6)',
          }}
          aria-hidden
        />

        <div className="rounded-xl border border-white/15 bg-black/10 p-3 backdrop-blur-sm">
          <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-white/70">
            Performance des projets
          </p>
          <div className="relative flex h-[88px] items-end justify-center gap-1.5 px-1 pt-4">
            {(
              [
                ['#8b5cf6', 52],
                ['#3b82f6', 72],
                ['#22c55e', 45],
                ['#f97316', 64],
              ] as const
            ).map(([color, h], i) => (
              <div
                key={i}
                className="w-[18%] max-w-[36px] rounded-t-md shadow-sm"
                style={{ height: `${h}%`, backgroundColor: color, minHeight: '28px' }}
                aria-hidden
              />
            ))}
            <svg className="pointer-events-none absolute inset-x-2 bottom-6 top-2 overflow-visible" aria-hidden>
              <path
                d="M 4 58 Q 32 38, 60 48 T 116 32 T 172 42"
                fill="none"
                stroke="rgba(125,211,252,0.85)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>

      <p className="relative z-10 mt-8 max-w-[300px] text-center text-sm font-medium leading-relaxed text-white/90">
        Tableau de bord de synthèse – Accès direct à vos métriques clés
      </p>
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

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError('');
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
    <div className="flex min-h-screen w-full flex-col bg-[#f0f2f5] lg:flex-row">
      <LoginHeroPanel />

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 lg:w-1/2 lg:px-10">
        <div className="w-full max-w-[400px] rounded-2xl border border-slate-200/80 bg-white p-8 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.18)] sm:p-9">
          <BrandLockup className="mb-6" />

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Bon retour</h1>
          <p className="mt-1 text-sm text-slate-500">BSERP — connexion</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-slate-900">
                E-mail
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
                  placeholder="prenom.nom@entreprise.fr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 rounded-xl border-slate-200 bg-white pl-10 text-sm text-slate-900 shadow-sm placeholder:italic placeholder:text-slate-400 focus-visible:border-[#0066ad]/50 focus-visible:ring-[#0066ad]/25"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="password" className="text-sm font-medium text-slate-900">
                  Mot de passe
                </Label>
                <button
                  type="button"
                  className="text-sm font-medium text-[#0066ad] hover:underline"
                  onClick={() =>
                    window.alert("Contactez votre administrateur BSERP pour réinitialiser votre mot de passe.")
                  }
                >
                  Oublié ?
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
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 rounded-xl border-slate-200 bg-white pl-10 pr-[5.5rem] text-sm text-slate-900 shadow-sm focus-visible:border-[#0066ad]/50 focus-visible:ring-[#0066ad]/25"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    {showPassword ? (
                      <>
                        <path d="M3 3l18 18M10.58 10.58a2 2 0 1 0 2.83 2.83" />
                        <path d="M9.88 9.88A3 3 0 0 1 12 5c4 0 7.33 4.67 7.33 4.67a18.5 18.5 0 0 1-2.09 2.51M6.53 6.53A18.5 18.5 0 0 0 2.67 9.33S6 14 12 14a9.74 9.74 0 0 0 3.13-.5" />
                      </>
                    ) : (
                      <>
                        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                        <circle cx="12" cy="12" r="3" />
                      </>
                    )}
                  </svg>
                  <span className="font-medium">Afficher</span>
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl border-0 text-base font-semibold text-white shadow-md transition-opacity disabled:opacity-60"
              style={{
                background: 'linear-gradient(180deg, #0b7fd4 0%, #005099 48%, #003d7a 100%)',
              }}
            >
              {loading ? 'Connexion…' : 'Se connecter'}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            Accès réservé — comptes gérés par l&apos;administration.
          </p>
        </div>
        </div>
      </div>
  );
}

