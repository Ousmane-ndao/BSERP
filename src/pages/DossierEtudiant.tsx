import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, GraduationCap, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { dossiersApi, studentAccountsApi, studentProgressApi } from '@/services/api';
import { useAuth, type Role } from '@/contexts/AuthContext';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useClient, useStudentAccount, useStudentProgress } from '@/hooks/useQueries';

interface ClientPayload {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string | null;
  destination: string | null;
  destinationId?: number;
}

interface StudentAccountPayload {
  clientId: string;
  destinationIsFrance: boolean;
  recordExists: boolean;
  email: string | null;
  emailPassword: string | null;
  campusPassword: string | null;
  parcoursupPassword: string | null;
}

interface StudentProgressPayload {
  clientId: string;
  recordExists: boolean;
  lettreMotivation: boolean;
  bulletinsEnregistres: boolean;
  travailEffectue: boolean;
  notesSaisies: boolean;
}

const EDIT_ROLES: Role[] = [
  'directrice',
  'responsable_admin',
  'conseillere_pedagogique',
  'informaticien',
  'commercial',
  'accueil',
];

export default function DossierEtudiant() {
  const { clientId = '' } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { hasAccess } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canEdit = hasAccess(EDIT_ROLES);

  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [campusPassword, setCampusPassword] = useState('');
  const [parcoursupPassword, setParcoursupPassword] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingProgressKey, setSavingProgressKey] = useState<string | null>(null);
  const [dossierProcedure, setDossierProcedure] = useState<string | null>(null);

  // Queries
  const { data: clientRes, isLoading: clientLoading } = useClient(clientId);
  const { data: accountRes, isLoading: accountLoading } = useStudentAccount(clientId);
  const { data: progressRes, isLoading: progressLoading } = useStudentProgress(clientId);

  const client = (clientRes?.data ?? null) as ClientPayload | null;
  const accountMeta = (accountRes?.data ?? null) as StudentAccountPayload | null;
  const progress = (progressRes?.data ?? null) as StudentProgressPayload | null;

  const loading = clientLoading || accountLoading || progressLoading;

  useEffect(() => {
    if (accountMeta) {
      setEmail(accountMeta.email ?? client?.email ?? '');
      setEmailPassword(accountMeta.emailPassword ?? '');
      setCampusPassword(accountMeta.campusPassword ?? '');
      setParcoursupPassword(accountMeta.parcoursupPassword ?? '');
    }
  }, [accountMeta, client?.email]);

  useEffect(() => {
    if (clientId) {
      void (async () => {
        try {
          const res = await dossiersApi.getAll({
            client_id: clientId,
            per_page: '1',
            sort_by: 'id',
            sort_dir: 'desc',
          });
          const first = res.data?.data?.[0];
          setDossierProcedure(first?.procedure ?? first?.type ?? null);
        } catch {
          // ignore
        }
      })();
    }
  }, [clientId]);

  const isFrance = accountMeta?.destinationIsFrance ?? false;
  const isParcoursupProcedure = dossierProcedure?.trim().toLowerCase() === 'parcoursup';

  const handleSaveAccounts = async (e: FormEvent) => {
    e.preventDefault();
    if (!clientId || !canEdit) return;
    setSavingAccount(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        email: email.trim() || null,
      };
      if (emailPassword.trim()) payload.email_password = emailPassword;
      if (isFrance) {
        if (campusPassword.trim()) payload.campus_password = campusPassword;
        if (parcoursupPassword.trim()) payload.parcoursup_password = parcoursupPassword;
      }

      if (accountMeta?.recordExists) {
        await studentAccountsApi.update(clientId, payload);
      } else {
        await studentAccountsApi.create({
          client_id: Number(clientId),
          ...payload,
        });
      }
      toast({
        title: 'Comptes mis à jour',
        description: 'Les informations des comptes étudiants ont été enregistrées.',
      });
      void queryClient.invalidateQueries({ queryKey: ['student_account', clientId] });
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const data = ax.response?.data;
      const fromFields = data?.errors ? Object.values(data.errors).flat().join(' ') : '';
      const msg = fromFields || data?.message || 'Enregistrement des comptes impossible.';
      setError(msg);
    } finally {
      setSavingAccount(false);
    }
  };

  const updateProgressField = async (
    patch: Partial<{
      lettreMotivation: boolean;
      bulletinsEnregistres: boolean;
      travailEffectue: boolean;
      notesSaisies: boolean;
    }>
  ) => {
    if (!clientId || !canEdit || !progress) return;
    const key = Object.keys(patch)[0] ?? '';
    setSavingProgressKey(key);
    try {
      const body = {
        lettre_motivation: patch.lettreMotivation ?? progress.lettreMotivation,
        bulletins_enregistres: patch.bulletinsEnregistres ?? progress.bulletinsEnregistres,
        travail_effectue: patch.travailEffectue ?? progress.travailEffectue,
        notes_saisies: patch.notesSaisies ?? progress.notesSaisies,
      };
      if (progress.recordExists) {
        await studentProgressApi.update(clientId, body);
      } else {
        await studentProgressApi.create({
          client_id: Number(clientId),
          ...body,
        });
      }
      toast({
        title: 'Suivi mis à jour',
        description: 'La modification a été enregistrée.',
      });
      void queryClient.invalidateQueries({ queryKey: ['student_progress', clientId] });
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || 'Erreur lors du suivi.');
    } finally {
      setSavingProgressKey(null);
    }
  };

  return (
    <DashboardPageShell
      title="Dossier étudiant"
      subtitle={client ? `${client.prenom} ${client.nom}` : (loading ? 'Chargement…' : '—')}
      stripLabel="Comptes et suivi du dossier"
      headerActions={
        <Button variant="outline" className="border-white/25 bg-white/10 text-white hover:bg-white/20" onClick={() => navigate('/clients')}>
          <ArrowLeft size={16} className="mr-2" />
          Retour
        </Button>
      }
    >
      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground p-12 justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
          Chargement du dossier...
        </div>
      )}
      {error && <p className="text-sm text-destructive font-medium">{error}</p>}

      {!loading && !client && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-600">
          Ce dossier est introuvable.
        </div>
      )}

      {!loading && client && (
        <div className="space-y-8">
          <section className="dashboard-chart-card space-y-4">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-emerald-500" />
              Informations Étudiant
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 py-2">
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-slate-400">Nom Complet</p>
                <p className="font-semibold text-slate-900">{client.prenom} {client.nom}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-slate-400">Email</p>
                <p className="font-semibold text-slate-900 break-all">{client.email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-slate-400">Téléphone</p>
                <p className="font-semibold text-slate-900">{client.telephone || '—'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-slate-400">Destination</p>
                <p className="font-semibold text-slate-900">{client.destination || '—'}</p>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <section className="lg:col-span-2 dashboard-chart-card space-y-6">
              <h2 className="text-sm font-bold text-slate-800">Identifiants de connexion</h2>
              
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <span className="text-slate-400 text-xs uppercase font-bold">Email Compte</span>
                    <p className="font-mono bg-white px-2 py-1 rounded border border-slate-200">{email || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400 text-xs uppercase font-bold">Mot de passe Email</span>
                    <p className="font-mono bg-white px-2 py-1 rounded border border-slate-200">{emailPassword || '—'}</p>
                  </div>
                  {isFrance && (
                    <>
                      <div className="space-y-1">
                        <span className="text-slate-400 text-xs uppercase font-bold">Campus France</span>
                        <p className="font-mono bg-white px-2 py-1 rounded border border-slate-200">{campusPassword || '—'}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-400 text-xs uppercase font-bold">Parcoursup</span>
                        <p className="font-mono bg-white px-2 py-1 rounded border border-slate-200">{parcoursupPassword || '—'}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {canEdit && (
                <form onSubmit={handleSaveAccounts} className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Modifier Email Compte</Label>
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Nouveau MDP Email</Label>
                      <Input type="text" value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} className="font-mono" />
                    </div>
                  </div>
                  {isFrance && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>MDP Campus France</Label>
                        <Input type="text" value={campusPassword} onChange={(e) => setCampusPassword(e.target.value)} className="font-mono" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>MDP Parcoursup</Label>
                        <Input type="text" value={parcoursupPassword} onChange={(e) => setParcoursupPassword(e.target.value)} className="font-mono" />
                      </div>
                    </div>
                  )}
                  <Button disabled={savingAccount}>
                    {savingAccount ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Enregistrer les modifications
                  </Button>
                </form>
              )}
            </section>

            <section className="dashboard-chart-card space-y-6">
              <h2 className="text-sm font-bold text-slate-800">Suivi Étapes</h2>
              {progress ? (
                <div className="space-y-4">
                  {[
                    { key: 'lettreMotivation', label: 'Motivation rédigée', api: 'lettreMotivation' as const },
                    { key: 'bulletinsEnregistres', label: 'Bulletins téléchargés', api: 'bulletinsEnregistres' as const },
                    { key: 'travailEffectue', label: 'Démarches effectuées', api: 'travailEffectue' as const },
                    { key: 'notesSaisies', label: 'Notes académiques OK', api: 'notesSaisies' as const },
                  ].map(({ key, label, api }) => (
                    <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 group transition-all hover:bg-emerald-50 hover:border-emerald-100">
                      <Label htmlFor={key} className="cursor-pointer font-medium text-slate-700 group-hover:text-emerald-900">{label}</Label>
                      <div className="flex items-center gap-2">
                        {savingProgressKey === key && <Loader2 className="h-3 w-3 animate-spin text-emerald-500" />}
                        <Checkbox
                          id={key}
                          checked={progress[api]}
                          disabled={!canEdit || savingProgressKey !== null}
                          onCheckedChange={(v) => void updateProgressField({ [api]: !!v })}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">Aucun suivi disponible pour ce profil.</p>
              )}
            </section>
          </div>
        </div>
      )}
    </DashboardPageShell>
  );
}
