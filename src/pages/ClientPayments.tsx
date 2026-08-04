import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  FileDown,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { DashboardMetricCard } from '@/components/dashboard/DashboardMetricCard';
import { DASH_AMBER, DASH_CORAL, DASH_METRIC_STYLES } from '@/lib/dashboardTheme';
import { APP_CURRENCY_LABEL, formatMoneyWithLabel } from '@/lib/currency';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  useClient,
  useDossierPaymentSummary,
  useDossierPayments,
  useDossiers,
} from '@/hooks/useQueries';
import {
  dossierPaymentsApi,
  downloadPaymentsExport,
  extractApiErrorMessage,
  paymentsApi,
} from '@/services/api';
import { useQueryClient } from '@tanstack/react-query';

const PAYMENT_ROLES = ['directrice', 'responsable_admin', 'comptable', 'informaticien'] as const;

interface PaymentItem {
  id: string;
  avanceNumero?: string | null;
  amount: string;
  method: string;
  paidAt: string;
  commentaire?: string | null;
}

interface PaymentSummary {
  montantTotal: string;
  totalPaye: string;
  soldeRestant: string;
  statutPaiement: string;
  destination?: string;
  dossierReference?: string;
}

interface DossierOption {
  id: string;
  reference: string;
}

function formatDateFr(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function statutBadgeClass(statut: string): string {
  switch (statut) {
    case 'Payé':
      return 'bg-emerald-100 text-emerald-800';
    case 'Partiel':
      return 'bg-amber-100 text-amber-800';
    case 'Trop-perçu':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

const PAYMENT_METHODS = ['Virement', 'Espèces', 'Chèque', 'Mobile Money', 'Wave', 'Orange Money'];

export default function ClientPayments() {
  const { clientId = '' } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasAccess } = useAuth();
  const queryClient = useQueryClient();
  const canManagePayments = hasAccess([...PAYMENT_ROLES]);

  const [selectedDossierId, setSelectedDossierId] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PaymentItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    amount: '',
    paid_at: '',
    method: 'Virement',
    commentaire: '',
    allow_overpayment: false,
  });

  const { data: clientRes, isLoading: clientLoading } = useClient(clientId);
  const client = clientRes?.data as { prenom?: string; nom?: string; destination?: string } | undefined;
  const clientName = client ? `${client.prenom ?? ''} ${client.nom ?? ''}`.trim() : 'Client';

  const { data: dossiersRes, isLoading: dossiersLoading } = useDossiers(
    clientId ? { client_id: clientId, per_page: '50' } : undefined,
  );
  const dossiers = (dossiersRes?.data ?? []) as DossierOption[];

  useEffect(() => {
    if (dossiers.length > 0 && !selectedDossierId) {
      setSelectedDossierId(String(dossiers[0].id));
    }
  }, [dossiers, selectedDossierId]);

  const { data: paymentsRes, isLoading: paymentsLoading } = useDossierPayments(
    clientId,
    selectedDossierId,
    { per_page: '100' },
  );
  const payments = (paymentsRes?.data ?? []) as PaymentItem[];

  const { data: summaryRes, isLoading: summaryLoading } = useDossierPaymentSummary(
    clientId,
    selectedDossierId,
  );
  const summary = summaryRes?.data as PaymentSummary | undefined;

  const metrics = useMemo(() => {
    if (!summary) return [];
    return [
      {
        label: 'Montant total',
        value: formatMoneyWithLabel(Number(summary.montantTotal)),
        icon: Wallet,
        ...DASH_METRIC_STYLES.green,
      },
      {
        label: 'Total payé',
        value: formatMoneyWithLabel(Number(summary.totalPaye)),
        icon: Wallet,
        ...DASH_METRIC_STYLES.amber,
      },
      {
        label: 'Solde restant',
        value: formatMoneyWithLabel(Number(summary.soldeRestant)),
        icon: Wallet,
        ...DASH_METRIC_STYLES.coral,
      },
    ];
  }, [summary]);

  const emptyForm = () => ({
    amount: '',
    paid_at: new Date().toISOString().slice(0, 10),
    method: 'Virement',
    commentaire: '',
    allow_overpayment: false,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['dossier_payments', clientId, selectedDossierId] });
    void queryClient.invalidateQueries({ queryKey: ['dossier_payment_summary', clientId, selectedDossierId] });
    void queryClient.invalidateQueries({ queryKey: ['payments'] });
    void queryClient.invalidateQueries({ queryKey: ['accounting_summary'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
  };

  const openCreate = () => {
    setDialogMode('create');
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (p: PaymentItem) => {
    setDialogMode('edit');
    setEditingId(p.id);
    setForm({
      amount: String(p.amount),
      paid_at: p.paidAt || '',
      method: p.method,
      commentaire: p.commentaire ?? '',
      allow_overpayment: false,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!clientId || !selectedDossierId) return;
    setSaving(true);
    try {
      const payload = {
        amount: Number(form.amount),
        paid_at: form.paid_at || null,
        method: form.method,
        commentaire: form.commentaire || null,
        allow_overpayment: form.allow_overpayment,
      };
      if (dialogMode === 'create') {
        await dossierPaymentsApi.create(clientId, selectedDossierId, payload);
        toast({ title: 'Acompte enregistré' });
      } else if (editingId) {
        await paymentsApi.update(editingId, payload);
        toast({ title: 'Acompte mis à jour' });
      }
      setDialogOpen(false);
      invalidate();
    } catch (err) {
      toast({
        title: 'Erreur',
        description: await extractApiErrorMessage(err, 'Opération impossible.'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await paymentsApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      toast({ title: 'Acompte supprimé' });
      invalidate();
    } catch (err) {
      toast({
        title: 'Erreur',
        description: await extractApiErrorMessage(err, 'Suppression impossible.'),
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      await downloadPaymentsExport(format, {
        client_id: clientId,
        dossier_id: selectedDossierId,
      });
    } catch (err) {
      toast({
        title: 'Export impossible',
        description: err instanceof Error ? err.message : 'Erreur inconnue',
        variant: 'destructive',
      });
    }
  };

  if (!canManagePayments) {
    return (
      <DashboardPageShell title="Paiements" subtitle="Accès restreint">
        <p className="text-sm text-muted-foreground">
          Vous n&apos;avez pas les droits pour consulter les paiements.
        </p>
        <Button variant="outline" onClick={() => navigate('/clients')} className="mt-4">
          <ArrowLeft size={16} className="mr-2" />
          Retour aux clients
        </Button>
      </DashboardPageShell>
    );
  }

  const loading = clientLoading || dossiersLoading;

  return (
    <DashboardPageShell
      title={`Paiements — ${clientName}`}
      subtitle={client?.destination ? `Destination : ${client.destination}` : 'Suivi des acomptes'}
      stripLabel="Comptabilité client"
      headerActions={
        selectedDossierId ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void handleExport('csv')}>
              <FileDown size={14} className="mr-1.5" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => void handleExport('excel')}>
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => void handleExport('pdf')}>
              PDF
            </Button>
            <Button onClick={openCreate} disabled={!selectedDossierId}>
              <Plus size={16} className="mr-2" />
              Ajouter un paiement
            </Button>
          </div>
        ) : undefined
      }
    >
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => navigate('/clients')}>
        <ArrowLeft size={16} className="mr-2" />
        Retour aux clients
      </Button>

      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground py-8">
          <Loader2 className="h-5 w-5 animate-spin" />
          Chargement...
        </div>
      )}

      {!loading && dossiers.length === 0 && (
        <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          <p>Aucun dossier trouvé pour ce client.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(`/dossiers?client=${clientId}`)}>
            Créer un dossier
          </Button>
        </div>
      )}

      {!loading && dossiers.length > 0 && (
        <>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <Label>Dossier</Label>
              <select
                className="h-10 min-w-[220px] rounded-md border border-input bg-background px-3 text-sm"
                value={selectedDossierId}
                onChange={(e) => setSelectedDossierId(e.target.value)}
              >
                {dossiers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.reference}
                  </option>
                ))}
              </select>
            </div>
            {summary && (
              <span
                className={`inline-flex self-start rounded-full px-3 py-1 text-xs font-semibold ${statutBadgeClass(summary.statutPaiement)}`}
              >
                {summary.statutPaiement}
              </span>
            )}
          </div>

          {(summaryLoading || summary) && (
            <div className="mb-6 grid gap-4 sm:grid-cols-3">
              {summaryLoading
                ? [1, 2, 3].map((i) => (
                    <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
                  ))
                : metrics.map((m) => <DashboardMetricCard key={m.label} {...m} />)}
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 font-semibold">Acompte</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Montant</th>
                  <th className="px-4 py-3 font-semibold">Mode</th>
                  <th className="px-4 py-3 font-semibold">Commentaire</th>
                  <th className="px-4 py-3 w-24" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paymentsLoading && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    </td>
                  </tr>
                )}
                {!paymentsLoading && payments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground italic">
                      Aucun acompte enregistré.
                    </td>
                  </tr>
                )}
                {!paymentsLoading &&
                  payments.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{p.avanceNumero ?? '—'}</td>
                      <td className="px-4 py-3 tabular-nums">{formatDateFr(p.paidAt)}</td>
                      <td className="px-4 py-3 font-semibold tabular-nums text-emerald-600">
                        {formatMoneyWithLabel(Number(p.amount))}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.method}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate" title={p.commentaire ?? undefined}>
                        {p.commentaire || '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                            <Pencil size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteTarget(p)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'create' ? 'Nouvel acompte' : 'Modifier acompte'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Montant ({APP_CURRENCY_LABEL})</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={form.paid_at}
                  onChange={(e) => setForm({ ...form, paid_at: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Mode de paiement</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.method}
                onChange={(e) => setForm({ ...form, method: e.target.value })}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Commentaire</Label>
              <Input
                value={form.commentaire}
                onChange={(e) => setForm({ ...form, commentaire: e.target.value })}
                placeholder="Ex. Avance 1 — dépôt initial"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="allow_overpayment"
                checked={form.allow_overpayment}
                onCheckedChange={(v) => setForm({ ...form, allow_overpayment: v === true })}
              />
              <Label htmlFor="allow_overpayment" className="font-normal cursor-pointer">
                Autoriser trop-perçu
              </Label>
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? 'Enregistrement...' : dialogMode === 'create' ? 'Enregistrer' : 'Mettre à jour'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet acompte ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le solde du dossier sera recalculé. Cette action est tracée dans l&apos;historique.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={deleting}>
              {deleting ? 'Suppression...' : 'Supprimer'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardPageShell>
  );
}
