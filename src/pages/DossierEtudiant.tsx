import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ArrowLeft, GraduationCap, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { clientsApi, dossiersApi, studentAccountsApi, studentProgressApi } from '@/services/api';
import { useAuth, type Role } from '@/contexts/AuthContext';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

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
  /** Mot de passe en clair (chiffré en base) — même principe d’affichage que l’email pour le personnel habilité */
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

interface DossierProcedurePayload {
  procedure?: string | null;
  type?: string | null;
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
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { hasAccess } = useAuth();
  const { toast } = useToast();
  const canEdit = hasAccess(EDIT_ROLES);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [client, setClient] = useState<ClientPayload | null>(null);
  const [accountMeta, setAccountMeta] = useState<StudentAccountPayload | null>(null);
  const [progress, setProgress] = useState<StudentProgressPayload | null>(null);
  const [dossierProcedure, setDossierProcedure] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [campusPassword, setCampusPassword] = useState('');
  const [parcoursupPassword, setParcoursupPassword] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingProgressKey, setSavingProgressKey] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    setError('');
    try {
      const [cRes, aRes, pRes] = await Promise.all([
        clientsApi.getById(clientId),
        studentAccountsApi.get(clientId),
        studentProgressApi.get(clientId),
      ]);
      const c = (cRes.data as { data?: ClientPayload })?.data;
      setClient(c ?? null);
      const acc = aRes.data?.data as StudentAccountPayload;
      const pro = pRes.data?.data as StudentProgressPayload;
      setAccountMeta(acc);
      setProgress(pro);
      setEmail(acc?.email ?? (c as ClientPayload).email ?? '');
      setEmailPassword(acc?.emailPassword ?? '');
      setCampusPassword(acc?.campusPassword ?? '');
      setParcoursupPassword(acc?.parcoursupPassword ?? '');

      // On récupère le dernier dossier du client pour connaître la procédure métier.
      const dossierRes = await dossiersApi.getAll({
        client_id: clientId,
        per_page: '1',
        sort_by: 'id',
        sort_dir: 'desc',
      });
      const firstDossier = (dossierRes.data?.data?.[0] ?? null) as DossierProcedurePayload | null;
      setDossierProcedure(firstDossier?.procedure ?? firstDossier?.type ?? null);
    } catch {
      setError('Impossible de charger le dossier étudiant.');
      setClient(null);
      setDossierProcedure(null);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

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
      await loadAll();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const data = ax.response?.data;
      const fromFields = data?.errors ? Object.values(data.errors).flat().join(' ') : '';
      const msg = fromFields || data?.message || 'Enregistrement des comptes impossible.';
      setError(msg);
      toast({
        title: 'Erreur',
        description: msg,
        variant: 'destructive',
      });
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
    const next: StudentProgressPayload = { ...progress, ...patch };
    setProgress(next);
    const key = Object.keys(patch)[0] ?? '';
    setSavingProgressKey(key);
    try {
      const body = {
        lettre_motivation: next.lettreMotivation,
        bulletins_enregistres: next.bulletinsEnregistres,
        travail_effectue: next.travailEffectue,
        notes_saisies: next.notesSaisies,
      };
      if (progress.recordExists) {
        await studentProgressApi.update(clientId, body);
      } else {
        await studentProgressApi.create({
          client_id: Number(clientId),
          ...body,
        });
        setProgress((p) => (p ? { ...p, recordExists: true } : p));
      }
      toast({
        title: 'Suivi du dossier mis à jour',
        description: 'La modification a été enregistrée avec succès.',
      });
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const data = ax.response?.data;
      const fromFields = data?.errors ? Object.values(data.errors).flat().join(' ') : '';
      const msg = fromFields || data?.message || 'Impossible de mettre à jour le suivi.';
      setError(msg);
      toast({
        title: 'Erreur',
        description: msg,
        variant: 'destructive',
      });
      await loadAll();
    } finally {
      setSavingProgressKey(null);
    }
  };

  if (!clientId) {
    return null;
  }

  return (
    <DashboardPageShell
      title="Dossier étudiant"
      subtitle={client ? `${client.prenom} ${client.nom}` : 'Chargement…'}
      stripLabel="Comptes et suivi du dossier"
      headerActions={
        <Button type="button" variant="outline" className="border-white/25 bg-white/10 text-white hover:bg-white/20" onClick={() => navigate('/clients')}>
          <ArrowLeft size={16} className="mr-2" />
          Retour aux clients
        </Button>
      }
    >
      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Chargement…
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && !client && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
          Client introuvable ou inaccessible.
        </div>
      )}

      {!loading && client && (
        <div className="space-y-8">
          <section className="dashboard-chart-card space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <GraduationCap className="h-5 w-5 text-emerald-600" aria-hidden />
              Informations client
            </div>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Nom</dt>
                <dd className="font-medium">
                  {client.prenom} {client.nom}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="font-medium">{client.email}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Téléphone</dt>
                <dd className="font-medium">{client.telephone || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Destination</dt>
                <dd className="font-medium">{client.destination || '—'}</dd>
              </div>
            </dl>
          </section>

          <section className="dashboard-chart-card space-y-4">
            <h2 className="text-sm font-semibold text-slate-800">Comptes étudiant</h2>
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
              <p className="font-medium text-slate-700">Aperçu (comme l’email, en clair pour le personnel autorisé)</p>
              <ul className="mt-2 space-y-1 break-all">
                <li>
                  Email (compte) : <span className="font-mono text-slate-800">{email || '—'}</span>
                </li>
                <li>
                  Mot de passe email :{' '}
                  <span className="font-mono text-slate-800">{emailPassword || '—'}</span>
                </li>
                {isFrance && (
                  <>
                    <li>
                      Campus France :{' '}
                      <span className="font-mono text-slate-800">{campusPassword || '—'}</span>
                    </li>
                    <li>
                      Parcoursup :{' '}
                      <span className="font-mono text-slate-800">{parcoursupPassword || '—'}</span>
                    </li>
                  </>
                )}
              </ul>
            </div>

            {canEdit ? (
              <form className="space-y-4" onSubmit={handleSaveAccounts}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="stu-email">Email (compte étudiant)</Label>
                    <Input id="stu-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="compte.etudiant@…" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="stu-email-pw">Mot de passe email</Label>
                    <Input
                      id="stu-email-pw"
                      type="text"
                      autoComplete="off"
                      value={emailPassword}
                      onChange={(e) => setEmailPassword(e.target.value)}
                      className="font-mono"
                      placeholder={accountMeta?.recordExists && accountMeta?.emailPassword ? 'Laisser vide pour ne pas modifier' : ''}
                    />
                  </div>
                </div>
                {isFrance && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="stu-campus">Mot de passe Campus France</Label>
                      <Input
                        id="stu-campus"
                        type="text"
                        autoComplete="off"
                        value={campusPassword}
                        onChange={(e) => setCampusPassword(e.target.value)}
                        className="font-mono"
                        placeholder={accountMeta?.recordExists && accountMeta?.campusPassword ? 'Laisser vide pour ne pas modifier' : ''}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="stu-parcoursup">Mot de passe Parcoursup</Label>
                      <Input
                        id="stu-parcoursup"
                        type="text"
                        autoComplete="off"
                        value={parcoursupPassword}
                        onChange={(e) => setParcoursupPassword(e.target.value)}
                        className="font-mono"
                        placeholder={accountMeta?.recordExists && accountMeta?.parcoursupPassword ? 'Laisser vide pour ne pas modifier' : ''}
                      />
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Laisser un champ vide pour ne pas modifier ce mot de passe. Stockage chiffré en base (clé APP_KEY).
                </p>
                <Button type="submit" disabled={savingAccount}>
                  {savingAccount ? 'Enregistrement…' : 'Enregistrer les comptes'}
                </Button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">Lecture seule — votre rôle ne permet pas de modifier ces comptes.</p>
            )}
          </section>

          {isParcoursupProcedure && (
            <section className="dashboard-chart-card space-y-4">
              <h2 className="text-sm font-semibold text-slate-800">Suivi du dossier</h2>
              {progress && (
                <ul className="space-y-3">
                  {[
                    { key: 'lettreMotivation', label: 'Motivation saisie', api: 'lettreMotivation' as const },
                    { key: 'bulletinsEnregistres', label: 'Bulletins inscrits', api: 'bulletinsEnregistres' as const },
                    { key: 'travailEffectue', label: 'Démarches OK', api: 'travailEffectue' as const },
                    { key: 'notesSaisies', label: 'Notes saisies', api: 'notesSaisies' as const },
                  ].map(({ key, label, api }) => (
                    <li key={key} className="flex items-center gap-3">
                      <Checkbox
                        id={key}
                        checked={progress[api]}
                        disabled={!canEdit || savingProgressKey !== null}
                        onCheckedChange={(v) => {
                          const checked = v === true;
                          void updateProgressField({ [api]: checked });
                        }}
                      />
                      <Label htmlFor={key} className="cursor-pointer font-normal leading-none peer-disabled:cursor-not-allowed">
                        {label}
                        {savingProgressKey === key && <Loader2 className="ml-2 inline h-3 w-3 animate-spin" aria-hidden />}
                      </Label>
                    </li>
                  ))}
                </ul>
              )}
              {!canEdit && <p className="text-sm text-muted-foreground">Lecture seule pour votre rôle.</p>}
            </section>
          )}
        </div>
      )}
    </DashboardPageShell>
  );
}
