import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { User, Lock, Building, Loader2, Coins } from 'lucide-react';
import { authApi, destinationsApi, settingsApi } from '@/services/api';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCompanySettings } from '@/hooks/useQueries';
import { APP_CURRENCY_LABEL } from '@/lib/currency';

interface DestinationTarif {
  id: number;
  name: string;
  region?: string | null;
  montantTotal: string;
}

export default function Parametres() {
  const { user, refreshUser, hasAccess } = useAuth();
  const canManageTarifs = hasAccess(['directrice', 'informaticien']);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('profil');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    telephone: user?.telephone ?? '',
  });
  const [securityForm, setSecurityForm] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });
  const [companyForm, setCompanyForm] = useState({
    company_name: '',
    address: '',
    city: '',
    country: '',
  });

  const tabs = [
    { key: 'profil', label: 'Profil', icon: User },
    { key: 'securite', label: 'Sécurité', icon: Lock },
    { key: 'entreprise', label: 'Entreprise', icon: Building },
    ...(canManageTarifs ? [{ key: 'tarifs', label: 'Tarifs destinations', icon: Coins }] : []),
  ];

  const { data: companyData, isLoading: companyLoading } = useCompanySettings();

  const { data: tarifsData, isLoading: tarifsLoading } = useQuery({
    queryKey: ['destinations_manage'],
    queryFn: async () => {
      const res = await destinationsApi.getManage();
      return res.data as DestinationTarif[];
    },
    enabled: canManageTarifs,
  });

  const [tarifEdits, setTarifEdits] = useState<Record<number, string>>({});
  const [savingTarifId, setSavingTarifId] = useState<number | null>(null);

  useEffect(() => {
    if (tarifsData) {
      const map: Record<number, string> = {};
      for (const d of tarifsData) {
        map[d.id] = d.montantTotal;
      }
      setTarifEdits(map);
    }
  }, [tarifsData]);

  useEffect(() => {
    setProfileForm((prev) => ({
      ...prev,
      name: user?.name ?? '',
      email: user?.email ?? '',
      telephone: user?.telephone ?? '',
    }));
  }, [user]);

  useEffect(() => {
    if (companyData) {
      setCompanyForm({
        company_name: String(companyData.company_name ?? '').trim(),
        address: String(companyData.address ?? '').trim(),
        city: String(companyData.city ?? '').trim(),
        country: String(companyData.country ?? '').trim(),
      });
    }
  }, [companyData]);

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await authApi.updateProfile(profileForm);
      await refreshUser();
      setMessage('Profil mis à jour.');
    } catch {
      setError('Erreur lors de la mise à jour du profil.');
    } finally {
      setLoading(false);
    }
  };

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await authApi.updatePassword(securityForm);
      setSecurityForm({ current_password: '', password: '', password_confirmation: '' });
      setMessage('Mot de passe mis à jour.');
    } catch {
      setError('Erreur lors de la mise à jour du mot de passe.');
    } finally {
      setLoading(false);
    }
  };

  const saveCompany = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await settingsApi.updateCompany(companyForm);
      setMessage('Informations entreprise mises à jour.');
      void queryClient.invalidateQueries({ queryKey: ['company_settings'] });
    } catch {
      setError('Erreur lors de la mise à jour entreprise (droits requis).');
    } finally {
      setLoading(false);
    }
  };

  const saveTarif = async (id: number) => {
    setSavingTarifId(id);
    setError('');
    setMessage('');
    try {
      await destinationsApi.update(id, { montant_total: Number(tarifEdits[id]) });
      setMessage('Tarif mis à jour.');
      void queryClient.invalidateQueries({ queryKey: ['destinations_manage'] });
      void queryClient.invalidateQueries({ queryKey: ['destinations'] });
    } catch {
      setError('Impossible de mettre à jour ce tarif.');
    } finally {
      setSavingTarifId(null);
    }
  };

  return (
    <DashboardPageShell title="Paramètres" subtitle="Configuration du système" stripLabel="Compte et préférences">
      {message && <p className="text-sm text-emerald-600 font-medium">{message}</p>}
      {error && <p className="text-sm text-destructive font-medium">{error}</p>}

      <div className="flex flex-wrap gap-2 border-b border-slate-200/90 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setActiveTab(t.key);
              setMessage('');
              setError('');
            }}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === t.key
                ? 'border-emerald-500 text-emerald-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      <div className={activeTab === 'tarifs' ? 'max-w-3xl' : 'max-w-xl'}>
        {activeTab === 'profil' && (
          <form className="dashboard-chart-card space-y-5" onSubmit={saveProfile}>
            <h2 className="font-semibold flex items-center gap-2 text-slate-800"><User size={18} className="text-emerald-500" />Informations personnelles</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nom complet</Label>
                <Input value={profileForm.name} onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={profileForm.email} onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))} type="email" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Téléphone</Label>
              <Input value={profileForm.telephone} onChange={(e) => setProfileForm((p) => ({ ...p, telephone: e.target.value }))} placeholder="+212 600 000 000" />
            </div>
            <Button disabled={loading} className="w-full sm:w-auto">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enregistrer
            </Button>
          </form>
        )}

        {activeTab === 'securite' && (
          <form className="dashboard-chart-card space-y-5" onSubmit={savePassword}>
            <h2 className="font-semibold flex items-center gap-2 text-slate-800"><Lock size={18} className="text-emerald-500" />Changer le mot de passe</h2>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Mot de passe actuel</Label>
                <Input type="password" placeholder="••••••••" value={securityForm.current_password} onChange={(e) => setSecurityForm((p) => ({ ...p, current_password: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Nouveau mot de passe</Label>
                <Input type="password" placeholder="••••••••" value={securityForm.password} onChange={(e) => setSecurityForm((p) => ({ ...p, password: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Confirmer</Label>
                <Input type="password" placeholder="••••••••" value={securityForm.password_confirmation} onChange={(e) => setSecurityForm((p) => ({ ...p, password_confirmation: e.target.value }))} />
              </div>
            </div>
            <Button disabled={loading} className="w-full sm:w-auto">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Mettre à jour
            </Button>
          </form>
        )}

        {activeTab === 'entreprise' && (
          <form className="dashboard-chart-card space-y-5" onSubmit={saveCompany}>
            <h2 className="font-semibold flex items-center gap-2 text-slate-800"><Building size={18} className="text-emerald-500" />Informations entreprise</h2>
            {companyLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement des informations...
              </div>
            )}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nom de l'entreprise</Label>
                <Input
                  value={companyForm.company_name}
                  onChange={(e) => setCompanyForm((p) => ({ ...p, company_name: e.target.value }))}
                  disabled={companyLoading}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Adresse</Label>
                <Input
                  value={companyForm.address}
                  onChange={(e) => setCompanyForm((p) => ({ ...p, address: e.target.value }))}
                  placeholder="Adresse"
                  disabled={companyLoading}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Ville</Label>
                  <Input
                    value={companyForm.city}
                    onChange={(e) => setCompanyForm((p) => ({ ...p, city: e.target.value }))}
                    placeholder="Ville"
                    disabled={companyLoading}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Pays</Label>
                  <Input
                    value={companyForm.country}
                    onChange={(e) => setCompanyForm((p) => ({ ...p, country: e.target.value }))}
                    disabled={companyLoading}
                  />
                </div>
              </div>
            </div>
            <Button disabled={loading || companyLoading} className="w-full sm:w-auto">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enregistrer
            </Button>
          </form>
        )}

        {activeTab === 'tarifs' && canManageTarifs && (
          <div className="dashboard-chart-card space-y-5">
            <h2 className="font-semibold flex items-center gap-2 text-slate-800">
              <Coins size={18} className="text-emerald-500" />
              Montants par destination ({APP_CURRENCY_LABEL})
            </h2>
            <p className="text-sm text-muted-foreground">
              Ces montants servent de base lors de la création d&apos;un dossier. Défaut : 272 500 FCFA.
            </p>
            {tarifsLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement des tarifs...
              </div>
            )}
            {!tarifsLoading && (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="p-3 text-left font-medium">Destination</th>
                      <th className="p-3 text-left font-medium">Région</th>
                      <th className="p-3 text-left font-medium">Montant ({APP_CURRENCY_LABEL})</th>
                      <th className="p-3 w-28" />
                    </tr>
                  </thead>
                  <tbody>
                    {(tarifsData ?? []).map((d) => (
                      <tr key={d.id} className="border-b last:border-0">
                        <td className="p-3 font-medium">{d.name}</td>
                        <td className="p-3 text-muted-foreground">{d.region ?? '—'}</td>
                        <td className="p-3">
                          <Input
                            type="number"
                            min="0"
                            className="max-w-[160px]"
                            value={tarifEdits[d.id] ?? d.montantTotal}
                            onChange={(e) =>
                              setTarifEdits((prev) => ({ ...prev, [d.id]: e.target.value }))
                            }
                          />
                        </td>
                        <td className="p-3">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={savingTarifId === d.id}
                            onClick={() => void saveTarif(d.id)}
                          >
                            {savingTarifId === d.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Enregistrer'
                            )}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardPageShell>
  );
}
