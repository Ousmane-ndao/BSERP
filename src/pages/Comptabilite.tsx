import { FormEvent, useMemo, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  Plus,
  Pencil,
  Trash2,
  FileDown,
  Mail,
  MessageCircle,
  Send,
  Table,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  accountingApi,
  downloadExport,
  downloadPaymentsExport,
  expensesApi,
  invoicesApi,
  paymentsApi,
} from '@/services/api';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { DashboardMetricCard, type DashboardMetricSpec } from '@/components/dashboard/DashboardMetricCard';
import { DASH_GREEN, DASH_CORAL, DASH_METRIC_STYLES, DASH_PURPLE, DASH_BLUE, DASH_ORANGE, DASH_AMBER } from '@/lib/dashboardTheme';
import { APP_CURRENCY_CODE, APP_CURRENCY_LABEL, formatMoneyWithLabel } from '@/lib/currency';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  useAccountingSummary,
  usePayments,
  useExpenses,
  useInvoices,
  useClientsOptions,
  useDestinations,
} from '@/hooks/useQueries';
import { Checkbox } from '@/components/ui/checkbox';

interface PaymentItem {
  id: string;
  clientId: string;
  dossierId?: string | null;
  avanceNumero?: string | null;
  amount: string;
  currency: string;
  method: string;
  paidAt: string;
  commentaire?: string | null;
  createdAt: string;
}

interface ExpenseItem {
  id: string;
  libelle: string;
  amount: string;
  currency: string;
  categorie: string | null;
  spentAt: string;
  createdAt: string;
}

interface InvoiceItem {
  id: string;
  clientId: string;
  numero: string;
  dateEmission: string;
  dateEcheance: string | null;
  statut: string;
  montantTtc: string;
  currency: string;
  notes: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  createdAt: string;
}

type InvoiceDeliveryChannel = 'email' | 'whatsapp';

interface InvoiceDeliveryResult {
  channel: 'email' | 'whatsapp' | 'none';
  status: 'sent' | 'pending' | 'missing_contact';
  message: string;
  pdfUrl?: string | null;
  whatsappUrl?: string | null;
}

interface ClientItem {
  id: string;
  nom: string;
  prenom: string;
}

interface MonthlyRow {
  month: string;
  label: string;
  revenue: number;
  expenses: number;
}

interface MethodRow {
  method: string;
  total: number;
}

interface AccountingSummary {
  pending_invoices: number;
  monthly: MonthlyRow[];
  payments_by_method: MethodRow[];
}

interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

const INVOICE_STATUT_LABELS: Record<string, string> = {
  brouillon: 'Brouillon',
  envoyee: 'En attente de paiement',
  payee: 'Payée',
  annulee: 'Annulée',
};

const PIE_COLORS = [DASH_GREEN, DASH_BLUE, DASH_PURPLE, DASH_ORANGE, DASH_AMBER, DASH_CORAL];

export default function Comptabilite() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('overview');
  const [pagePayments, setPagePayments] = useState(1);
  const [pageExpenses, setPageExpenses] = useState(1);
  const [pageInvoices, setPageInvoices] = useState(1);

  // Queries
  const { data: summaryRes, isLoading: summaryLoading } = useAccountingSummary();
  const { data: paymentsRes, isLoading: paymentsLoading } = usePayments({ per_page: '20', page: String(pagePayments) });
  const { data: expensesRes, isLoading: expensesLoading } = useExpenses({ per_page: '20', page: String(pageExpenses) });
  const { data: invoicesRes, isLoading: invoicesLoading } = useInvoices({ per_page: '20', page: String(pageInvoices) });
  const { data: clientsRes } = useClientsOptions();
  const { data: destinationsData } = useDestinations();

  const summary = useMemo(() => {
    if (!summaryRes) return null;
    const s = summaryRes as any;
    return {
      pending_invoices: Number(s?.pending_invoices ?? 0),
      monthly: Array.isArray(s?.monthly) ? s.monthly : [],
      payments_by_method: Array.isArray(s?.payments_by_method) ? s.payments_by_method : [],
    } as AccountingSummary;
  }, [summaryRes]);

  const payments = (paymentsRes?.data ?? []) as PaymentItem[];
  const paymentsMeta = (paymentsRes?.meta ?? null) as PaginationMeta | null;

  const expenses = (expensesRes?.data ?? []) as ExpenseItem[];
  const expensesMeta = (expensesRes?.meta ?? null) as PaginationMeta | null;

  const invoices = (invoicesRes?.data ?? []) as InvoiceItem[];
  const invoicesMeta = (invoicesRes?.meta ?? null) as PaginationMeta | null;

  const clients = (clientsRes?.data ?? []) as ClientItem[];
  const destinations = (destinationsData ?? []) as { id: number; name: string }[];

  const [paymentExportFilters, setPaymentExportFilters] = useState({
    destination_id: '',
    date_from: '',
    date_to: '',
    statut: '',
  });

  // Mutations related state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletePayment, setDeletePayment] = useState<PaymentItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [expenseDialogMode, setExpenseDialogMode] = useState<'create' | 'edit'>('create');
  const [expenseEditingId, setExpenseEditingId] = useState<string | null>(null);
  const [deleteExpense, setDeleteExpense] = useState<ExpenseItem | null>(null);
  const [expenseDeleting, setExpenseDeleting] = useState(false);

  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [invoiceDialogMode, setInvoiceDialogMode] = useState<'create' | 'edit'>('create');
  const [invoiceEditingId, setInvoiceEditingId] = useState<string | null>(null);
  const [deleteInvoice, setDeleteInvoice] = useState<InvoiceItem | null>(null);
  const [invoiceDeleting, setInvoiceDeleting] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    client_id: '',
    amount: '',
    paid_at: '',
    method: 'Virement',
    commentaire: '',
    allow_overpayment: false,
  });

  const [expenseForm, setExpenseForm] = useState({
    libelle: '',
    amount: '',
    spent_at: '',
    categorie: '',
  });

  const [invoiceForm, setInvoiceForm] = useState({
    client_id: '',
    date_emission: '',
    date_echeance: '',
    statut: 'brouillon',
    amount: '',
    notes: '',
    numero: '',
    auto_send: true,
    send_email: true,
    send_whatsapp: true,
  });

  const emptyPaymentForm = () => ({
    client_id: '',
    amount: '',
    paid_at: '',
    method: 'Virement',
    commentaire: '',
    allow_overpayment: false,
  });

  const emptyExpenseForm = () => ({
    libelle: '',
    amount: '',
    spent_at: '',
    categorie: '',
  });

  const emptyInvoiceForm = () => ({
    client_id: '',
    date_emission: '',
    date_echeance: '',
    statut: 'brouillon',
    amount: '',
    notes: '',
    numero: '',
    auto_send: true,
    send_email: true,
    send_whatsapp: true,
  });

  const clientNames = useMemo(() => {
    const map = new Map<string, string>();
    clients.forEach((c) => map.set(c.id, `${c.prenom} ${c.nom}`));
    return map;
  }, [clients]);

  const totalRevenue = (summary?.monthly ?? []).reduce((sum, m) => sum + Number(m.revenue || 0), 0);
  const totalExpenseAmount = (summary?.monthly ?? []).reduce((sum, m) => sum + Number(m.expenses || 0), 0);
  const pendingCount = summary?.pending_invoices ?? 0;
  const netProfit = totalRevenue - totalExpenseAmount;

  const stats = useMemo((): DashboardMetricSpec[] => {
    return [
      {
        label: 'Revenus totaux',
        value: formatMoneyWithLabel(totalRevenue),
        icon: TrendingUp,
        ...DASH_METRIC_STYLES.green,
      },
      {
        label: 'Dépenses',
        value: formatMoneyWithLabel(totalExpenseAmount),
        icon: TrendingDown,
        ...DASH_METRIC_STYLES.coral,
      },
      { label: 'Factures en attente', value: String(pendingCount), icon: Receipt, ...DASH_METRIC_STYLES.amber },
      {
        label: 'Bénéfice net',
        value: formatMoneyWithLabel(netProfit),
        icon: DollarSign,
        ...DASH_METRIC_STYLES.orange,
      },
    ];
  }, [totalRevenue, totalExpenseAmount, pendingCount, netProfit]);

  const pieByMethod = useMemo(() => {
    const rows = summary?.payments_by_method ?? [];
    return rows
      .filter((r) => r.total > 0)
      .map((r, i) => ({
        name: r.method,
        value: r.total,
        color: PIE_COLORS[i % PIE_COLORS.length],
      }));
  }, [summary?.payments_by_method]);

  // Handlers
  const openCreatePayment = () => {
    setDialogMode('create');
    setEditingId(null);
    setForm(emptyPaymentForm());
    setDialogOpen(true);
  };

  const openEditPayment = (p: PaymentItem) => {
    setDialogMode('edit');
    setEditingId(p.id);
    setForm({
      client_id: p.clientId,
      amount: String(p.amount),
      paid_at: p.paidAt || '',
      method: p.method,
      commentaire: p.commentaire ?? '',
      allow_overpayment: false,
    });
    setDialogOpen(true);
  };

  const formatDateFr = (iso: string) => {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return y && m && d ? `${d}/${m}/${y}` : iso;
  };

  const handleSubmitPayment = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.client_id) return;
    setSaving(true);
    try {
      const payload = {
        client_id: Number(form.client_id),
        amount: Number(form.amount),
        paid_at: form.paid_at || null,
        method: form.method,
        commentaire: form.commentaire || null,
        allow_overpayment: form.allow_overpayment,
        currency: APP_CURRENCY_CODE,
      };
      if (dialogMode === 'create') {
        await paymentsApi.create(payload);
      } else if (editingId) {
        await paymentsApi.update(editingId, payload);
      }
      setDialogOpen(false);
      setForm(emptyPaymentForm());
      setDialogMode('create');
      setEditingId(null);
      void queryClient.invalidateQueries({ queryKey: ['payments'] });
      void queryClient.invalidateQueries({ queryKey: ['accounting_summary'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
    } catch {
      setError(dialogMode === 'create' ? "Impossible d'enregistrer le paiement." : 'Impossible de mettre à jour le paiement.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDeletePayment = async () => {
    if (!deletePayment) return;
    setDeleting(true);
    try {
      await paymentsApi.delete(deletePayment.id);
      setDeletePayment(null);
      void queryClient.invalidateQueries({ queryKey: ['payments'] });
      void queryClient.invalidateQueries({ queryKey: ['accounting_summary'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
    } catch {
      setError('Impossible de supprimer le paiement.');
    } finally {
      setDeleting(false);
    }
  };

  const openCreateExpense = () => {
    setExpenseDialogMode('create');
    setExpenseEditingId(null);
    setExpenseForm(emptyExpenseForm());
    setExpenseDialogOpen(true);
  };

  const openEditExpense = (x: ExpenseItem) => {
    setExpenseDialogMode('edit');
    setExpenseEditingId(x.id);
    setExpenseForm({
      libelle: x.libelle,
      amount: String(x.amount),
      spent_at: x.spentAt || '',
      categorie: x.categorie ?? '',
    });
    setExpenseDialogOpen(true);
  };

  const handleSubmitExpense = async (e: FormEvent) => {
    e.preventDefault();
    if (!expenseForm.libelle) return;
    setSaving(true);
    try {
      const payload = {
        libelle: expenseForm.libelle,
        amount: Number(expenseForm.amount),
        spent_at: expenseForm.spent_at || null,
        categorie: expenseForm.categorie || null,
        currency: APP_CURRENCY_CODE,
      };
      if (expenseDialogMode === 'create') {
        await expensesApi.create(payload);
      } else if (expenseEditingId) {
        await expensesApi.update(expenseEditingId, payload);
      }
      setExpenseDialogOpen(false);
      setExpenseForm(emptyExpenseForm());
      setExpenseDialogMode('create');
      setExpenseEditingId(null);
      void queryClient.invalidateQueries({ queryKey: ['expenses'] });
      void queryClient.invalidateQueries({ queryKey: ['accounting_summary'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
    } catch {
      setError(
        expenseDialogMode === 'create' ? "Impossible d'enregistrer la dépense." : 'Impossible de mettre à jour la dépense.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDeleteExpense = async () => {
    if (!deleteExpense) return;
    setExpenseDeleting(true);
    try {
      await expensesApi.delete(deleteExpense.id);
      setDeleteExpense(null);
      void queryClient.invalidateQueries({ queryKey: ['expenses'] });
      void queryClient.invalidateQueries({ queryKey: ['accounting_summary'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
    } catch {
      setError('Impossible de supprimer la dépense.');
    } finally {
      setExpenseDeleting(false);
    }
  };

  const openCreateInvoice = () => {
    setInvoiceDialogMode('create');
    setInvoiceEditingId(null);
    setInvoiceForm(emptyInvoiceForm());
    setInvoiceDialogOpen(true);
  };

  const openEditInvoice = (inv: InvoiceItem) => {
    setInvoiceDialogMode('edit');
    setInvoiceEditingId(inv.id);
    setInvoiceForm({
      client_id: inv.clientId,
      date_emission: inv.dateEmission || '',
      date_echeance: inv.dateEcheance || '',
      statut: inv.statut,
      amount: String(inv.montantTtc),
      notes: inv.notes ?? '',
      numero: inv.numero,
      auto_send: true,
      send_email: true,
      send_whatsapp: true,
    });
    setInvoiceDialogOpen(true);
  };

  const sendInvoiceToChannels = async (invoiceId: string, channels: InvoiceDeliveryChannel[]) => {
    if (channels.length === 0) return;
    const tasks = channels.map(async (channel) => {
      if (channel === 'email') {
        await invoicesApi.sendEmail(invoiceId);
        return 'email';
      }
      const res = await invoicesApi.getShareLinks(invoiceId);
      const url = (res.data?.data?.whatsappUrl ?? '') as string;
      if (!url) {
        throw new Error('WHATSAPP_UNAVAILABLE');
      }
      window.open(url, '_blank', 'noopener,noreferrer');
      return 'whatsapp';
    });

    const results = await Promise.allSettled(tasks);
    const success = results.filter((r) => r.status === 'fulfilled').map((r) => (r as PromiseFulfilledResult<string>).value);
    const failed = results.filter((r) => r.status === 'rejected');

    if (success.length > 0) {
      toast({
        title: 'Envoi préparé',
        description: `Canal${success.length > 1 ? 'x' : ''} prêt${success.length > 1 ? 's' : ''}: ${success.join(', ')}`,
      });
    }
    if (failed.length > 0) {
      setError("Une partie de l'envoi du reçu a échoué.");
    }
  };

  const handleAutoDeliveryResult = (delivery: InvoiceDeliveryResult | null, opts?: { openWhatsapp?: boolean }) => {
    if (!delivery) return;

    if (delivery.channel === 'email' && delivery.status === 'sent') {
      toast({
        title: 'Facture envoyée',
        description: delivery.message,
      });
      return;
    }

    if (delivery.channel === 'whatsapp' && delivery.whatsappUrl) {
      if (opts?.openWhatsapp) {
        window.open(delivery.whatsappUrl, '_blank', 'noopener,noreferrer');
      }
      toast({
        title: 'Envoi WhatsApp prêt',
        description: delivery.message,
      });
      return;
    }

    if (delivery.channel === 'none' || delivery.status === 'missing_contact') {
      setError(delivery.message || "Aucun contact client disponible pour l'envoi.");
    }
  };

  const handleSubmitInvoice = async (e: FormEvent) => {
    e.preventDefault();
    if (!invoiceForm.client_id) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        client_id: Number(invoiceForm.client_id),
        date_emission: invoiceForm.date_emission || null,
        date_echeance: invoiceForm.date_echeance || null,
        statut: invoiceForm.statut,
        amount: Number(invoiceForm.amount),
        notes: invoiceForm.notes || null,
        currency: APP_CURRENCY_CODE,
      };
      if (invoiceDialogMode === 'edit' && invoiceForm.numero) {
        payload.numero = invoiceForm.numero;
      }
      let invoiceIdForSend: string | null = null;
      let createDelivery: InvoiceDeliveryResult | null = null;
      if (invoiceDialogMode === 'create') {
        const created = await invoicesApi.create(payload);
        invoiceIdForSend = (created.data?.data?.id ?? null) as string | null;
        createDelivery = (created.data?.delivery ?? null) as InvoiceDeliveryResult | null;
      } else if (invoiceEditingId) {
        const updated = await invoicesApi.update(invoiceEditingId, payload);
        invoiceIdForSend = (updated.data?.data?.id ?? invoiceEditingId) as string | null;
      }

      if (invoiceDialogMode === 'create') {
        handleAutoDeliveryResult(createDelivery, { openWhatsapp: invoiceForm.auto_send && invoiceForm.send_whatsapp });
      }

      const shouldAutoSend = invoiceForm.auto_send && ['envoyee', 'payee'].includes(invoiceForm.statut);
      if (invoiceDialogMode === 'edit' && shouldAutoSend && invoiceIdForSend) {
        const channels: InvoiceDeliveryChannel[] = [];
        if (invoiceForm.send_email) channels.push('email');
        if (invoiceForm.send_whatsapp) channels.push('whatsapp');
        void sendInvoiceToChannels(invoiceIdForSend, channels);
      }
      setInvoiceDialogOpen(false);
      setInvoiceForm(emptyInvoiceForm());
      setInvoiceDialogMode('create');
      setInvoiceEditingId(null);
      void queryClient.invalidateQueries({ queryKey: ['invoices'] });
      void queryClient.invalidateQueries({ queryKey: ['accounting_summary'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
    } catch {
      setError(
        invoiceDialogMode === 'create' ? "Impossible d'enregistrer la facture." : 'Impossible de mettre à jour la facture.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDeleteInvoice = async () => {
    if (!deleteInvoice) return;
    setInvoiceDeleting(true);
    try {
      await invoicesApi.delete(deleteInvoice.id);
      setDeleteInvoice(null);
      void queryClient.invalidateQueries({ queryKey: ['invoices'] });
      void queryClient.invalidateQueries({ queryKey: ['accounting_summary'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
    } catch {
      setError('Impossible de supprimer la facture.');
    } finally {
      setInvoiceDeleting(false);
    }
  };

  const handleDownloadInvoicePdf = async (id: string, numero: string) => {
    try {
      const res = await invoicesApi.downloadPdf(id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `facture-${numero}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Impossible de télécharger le PDF.');
    }
  };

  const handleSendInvoice = async (id: string, channels: InvoiceDeliveryChannel[]) => {
    try {
      await sendInvoiceToChannels(id, channels);
    } catch {
      setError("Impossible d'envoyer le recu.");
    }
  };

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      {tab === 'overview' && (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-slate-200 bg-white"
            onClick={() => void downloadExport('/exports/payments.csv', 'paiements.csv')}
          >
            <Table size={14} className="mr-1.5" />
            CSV paiements
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-slate-200 bg-white"
            onClick={() => void downloadExport('/exports/expenses.csv', 'depenses.csv')}
          >
            <Table size={14} className="mr-1.5" />
            CSV dépenses
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-slate-200 bg-white"
            onClick={() => void downloadExport('/exports/accounting.xlsx', 'comptabilite.xlsx')}
          >
            Excel
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-slate-200 bg-white"
            onClick={() => void downloadExport('/exports/accounting.pdf', 'rapport.pdf')}
          >
            PDF rapport
          </Button>
        </>
      )}
      {tab === 'payments' && (
        <>
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={paymentExportFilters.destination_id}
            onChange={(e) => setPaymentExportFilters((f) => ({ ...f, destination_id: e.target.value }))}
          >
            <option value="">Toutes destinations</option>
            {destinations.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={paymentExportFilters.statut}
            onChange={(e) => setPaymentExportFilters((f) => ({ ...f, statut: e.target.value }))}
          >
            <option value="">Tous statuts</option>
            <option value="Payé">Payé</option>
            <option value="Partiel">Partiel</option>
            <option value="En attente">En attente</option>
            <option value="Trop-perçu">Trop-perçu</option>
          </select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-slate-200 bg-white"
            onClick={() => void downloadPaymentsExport('csv', paymentExportFilters)}
          >
            CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-slate-200 bg-white"
            onClick={() => void downloadPaymentsExport('excel', paymentExportFilters)}
          >
            Excel
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-slate-200 bg-white"
            onClick={() => void downloadPaymentsExport('pdf', paymentExportFilters)}
          >
            PDF
          </Button>
          <Button
            type="button"
            className="border-0 bg-white text-slate-900 shadow-sm hover:bg-white/90"
            onClick={openCreatePayment}
          >
            <Plus size={16} className="mr-2" />
            Nouveau paiement
          </Button>
        </>
      )}
      {tab === 'expenses' && (
        <Button
          type="button"
          className="border-0 bg-white text-slate-900 shadow-sm hover:bg-white/90"
          onClick={openCreateExpense}
        >
          <Plus size={16} className="mr-2" />
          Nouvelle dépense
        </Button>
      )}
      {tab === 'invoices' && (
        <Button
          type="button"
          className="border-0 bg-white text-slate-900 shadow-sm hover:bg-white/90"
          onClick={openCreateInvoice}
        >
          <Plus size={16} className="mr-2" />
          Nouvelle facture
        </Button>
      )}
    </div>
  );

  return (
    <DashboardPageShell
      title="Comptabilité"
      subtitle="Suivi financier et facturation"
      stripLabel="Indicateurs et graphiques"
      headerActions={headerActions}
    >
      {error && <p className="text-sm text-destructive">{error}</p>}

      <AlertDialog open={!!deletePayment} onOpenChange={(open) => !open && setDeletePayment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce paiement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le montant enregistré sera retiré des statistiques. Cette action est définitive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={handleConfirmDeletePayment}
            >
              {deleting ? 'Suppression...' : 'Supprimer'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteExpense} onOpenChange={(open) => !open && setDeleteExpense(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette dépense ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={expenseDeleting}>Annuler</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={expenseDeleting}
              onClick={handleConfirmDeleteExpense}
            >
              {expenseDeleting ? 'Suppression...' : 'Supprimer'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteInvoice} onOpenChange={(open) => !open && setDeleteInvoice(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette facture ?</AlertDialogTitle>
            <AlertDialogDescription>Cela annulera le document dans la base.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={invoiceDeleting}>Annuler</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={invoiceDeleting}
              onClick={handleConfirmDeleteInvoice}
            >
              {invoiceDeleting ? 'Suppression...' : 'Supprimer'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="payments">Paiements encaissés</TabsTrigger>
          <TabsTrigger value="expenses">Dépenses effectuées</TabsTrigger>
          <TabsTrigger value="invoices">Facturation</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 outline-none">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s, i) => (
              <DashboardMetricCard key={i} {...s} loading={summaryLoading} />
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h3 className="mb-6 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Evolution Mensuelle</h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary?.monthly ?? []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                      cursor={{ fill: 'hsl(var(--muted)/0.4)' }}
                    />
                    <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
                    <Bar dataKey="revenue" name="Revenus" fill={DASH_GREEN} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Dépenses" fill={DASH_CORAL} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h3 className="mb-6 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Paiements par méthode</h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieByMethod}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieByMethod.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                    />
                    <Legend verticalAlign="bottom" align="center" iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4 outline-none">
          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 font-semibold">Acompte</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Client</th>
                  <th className="px-4 py-3 font-semibold">Montant</th>
                  <th className="px-4 py-3 font-semibold">Méthode</th>
                  <th className="px-4 py-3 font-semibold">Commentaire</th>
                  <th className="px-4 py-3 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paymentsLoading && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground italic">Chargement...</td>
                  </tr>
                )}
                {!paymentsLoading && payments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground italic">Aucun paiement trouvé.</td>
                  </tr>
                )}
                {!paymentsLoading && payments.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{p.avanceNumero ?? '—'}</td>
                    <td className="px-4 py-3 tabular-nums">{formatDateFr(p.paidAt)}</td>
                    <td className="px-4 py-3 font-medium">{clientNames.get(p.clientId) ?? 'Client inconnu'}</td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatMoneyWithLabel(Number(p.amount))}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.method}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[160px] truncate" title={p.commentaire ?? undefined}>
                      {p.commentaire || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditPayment(p)}>
                          <Pencil size={14} />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => setDeletePayment(p)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {paymentsMeta && paymentsMeta.last_page > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-t border-border rounded-b-xl">
              <span className="text-xs text-muted-foreground">
                Page {pagePayments} sur {paymentsMeta.last_page} ({paymentsMeta.total} total)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagePayments((p) => Math.max(1, p - 1))}
                  disabled={pagePayments === 1}
                >
                  <ChevronLeft size={14} className="mr-1" /> Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagePayments((p) => Math.min(paymentsMeta.last_page, p + 1))}
                  disabled={pagePayments === paymentsMeta.last_page}
                >
                  Suivant <ChevronRight size={14} className="ml-1" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4 outline-none">
          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Libellé</th>
                  <th className="px-4 py-3 font-semibold">Catégorie</th>
                  <th className="px-4 py-3 font-semibold">Montant</th>
                  <th className="px-4 py-3 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {expensesLoading && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground italic">Chargement...</td>
                  </tr>
                )}
                {!expensesLoading && expenses.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground italic">Aucune dépense trouvée.</td>
                  </tr>
                )}
                {!expensesLoading && expenses.map((x) => (
                  <tr key={x.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 tabular-nums">{x.spentAt}</td>
                    <td className="px-4 py-3 font-medium">{x.libelle}</td>
                    <td className="px-4 py-3 text-muted-foreground">{x.categorie || 'Non classé'}</td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                      {formatMoneyWithLabel(Number(x.amount))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditExpense(x)}>
                          <Pencil size={14} />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleteExpense(x)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {expensesMeta && expensesMeta.last_page > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-t border-border rounded-b-xl">
              <span className="text-xs text-muted-foreground">
                Page {pageExpenses} sur {expensesMeta.last_page} ({expensesMeta.total} total)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPageExpenses((p) => Math.max(1, p - 1))}
                  disabled={pageExpenses === 1}
                >
                  <ChevronLeft size={14} className="mr-1" /> Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPageExpenses((p) => Math.min(expensesMeta.last_page, p + 1))}
                  disabled={pageExpenses === expensesMeta.last_page}
                >
                  Suivant <ChevronRight size={14} className="ml-1" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4 outline-none">
          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 font-semibold">N°</th>
                  <th className="px-4 py-3 font-semibold">Client</th>
                  <th className="px-4 py-3 font-semibold">Émission</th>
                  <th className="px-4 py-3 font-semibold">Statut</th>
                  <th className="px-4 py-3 font-semibold">Montant</th>
                  <th className="px-4 py-3 w-32" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoicesLoading && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground italic">Chargement...</td>
                  </tr>
                )}
                {!invoicesLoading && invoices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground italic">Aucune facture trouvée.</td>
                  </tr>
                )}
                {!invoicesLoading && invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium tabular-nums">{inv.numero}</td>
                    <td className="px-4 py-3">{clientNames.get(inv.clientId) || 'Client inconnu'}</td>
                    <td className="px-4 py-3 tabular-nums">{inv.dateEmission}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium border ${
                        inv.statut === 'payee' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' :
                        inv.statut === 'envoyee' ? 'bg-blue-500/10 text-blue-600 border-blue-200' :
                        inv.statut === 'annulee' ? 'bg-rose-500/10 text-rose-600 border-rose-200' :
                        'bg-slate-500/10 text-slate-600 border-slate-200'
                      }`}>
                        {INVOICE_STATUT_LABELS[inv.statut] || inv.statut}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums">
                      {formatMoneyWithLabel(Number(inv.montantTtc))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleDownloadInvoicePdf(inv.id, inv.numero)}>
                          <FileDown size={14} />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Send size={14} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleSendInvoice(inv.id, ['email'])}>
                              <Mail size={14} className="mr-2" /> E-mail
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSendInvoice(inv.id, ['whatsapp'])}>
                              <MessageCircle size={14} className="mr-2" /> WhatsApp
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="ghost" size="sm" onClick={() => openEditInvoice(inv)}>
                          <Pencil size={14} />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleteInvoice(inv)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {invoicesMeta && invoicesMeta.last_page > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-t border-border rounded-b-xl">
              <span className="text-xs text-muted-foreground">
                Page {pageInvoices} sur {invoicesMeta.last_page} ({invoicesMeta.total} total)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPageInvoices((p) => Math.max(1, p - 1))}
                  disabled={pageInvoices === 1}
                >
                  <ChevronLeft size={14} className="mr-1" /> Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPageInvoices((p) => Math.min(invoicesMeta.last_page, p + 1))}
                  disabled={pageInvoices === invoicesMeta.last_page}
                >
                  Suivant <ChevronRight size={14} className="ml-1" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs for forms */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogMode === 'create' ? 'Nouveau paiement' : 'Modifier paiement'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitPayment} className="space-y-4">
            <div className="space-y-2">
              <Label>Client</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.client_id}
                onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                required
              >
                <option value="">Sélectionner un client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Montant ({APP_CURRENCY_LABEL})</Label>
                <Input
                  type="number"
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
              <Label>Méthode de paiement</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.method}
                onChange={(e) => setForm({ ...form, method: e.target.value })}
              >
                <option value="Virement">Virement</option>
                <option value="Espèces">Espèces</option>
                <option value="Chèque">Chèque</option>
                <option value="Mobile Money">Mobile Money</option>
                <option value="Wave">Wave</option>
                <option value="Orange Money">Orange Money</option>
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
                id="payment_allow_overpayment"
                checked={form.allow_overpayment}
                onCheckedChange={(v) => setForm({ ...form, allow_overpayment: v === true })}
              />
              <Label htmlFor="payment_allow_overpayment" className="font-normal cursor-pointer">
                Autoriser trop-perçu
              </Label>
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? 'Enregistrement...' : (dialogMode === 'create' ? 'Enregistrer' : 'Mettre à jour')}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{expenseDialogMode === 'create' ? 'Nouvelle dépense' : 'Modifier dépense'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitExpense} className="space-y-4">
            <div className="space-y-2">
              <Label>Libellé</Label>
              <Input
                value={expenseForm.libelle}
                onChange={(e) => setExpenseForm({ ...expenseForm, libelle: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Montant ({APP_CURRENCY_LABEL})</Label>
                <Input
                  type="number"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={expenseForm.spent_at}
                  onChange={(e) => setExpenseForm({ ...expenseForm, spent_at: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Input
                value={expenseForm.categorie}
                onChange={(e) => setExpenseForm({ ...expenseForm, categorie: e.target.value })}
              />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? 'Enregistrement...' : (expenseDialogMode === 'create' ? 'Enregistrer' : 'Mettre à jour')}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{invoiceDialogMode === 'create' ? 'Nouvelle facture' : 'Modifier facture'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitInvoice} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={invoiceForm.client_id}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, client_id: e.target.value })}
                  required
                >
                  <option value="">Sélectionner un client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Montant TTC ({APP_CURRENCY_LABEL})</Label>
                <Input
                  type="number"
                  value={invoiceForm.amount}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date émission</Label>
                <Input
                  type="date"
                  value={invoiceForm.date_emission}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, date_emission: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Date échéance</Label>
                <Input
                  type="date"
                  value={invoiceForm.date_echeance}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, date_echeance: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={invoiceForm.statut}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, statut: e.target.value })}
              >
                {Object.entries(INVOICE_STATUT_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={invoiceForm.notes}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                placeholder="Ex: Frais de dossier, Service spécifique..."
              />
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="auto_send"
                  checked={invoiceForm.auto_send}
                  onCheckedChange={(val) => setInvoiceForm({ ...invoiceForm, auto_send: !!val })}
                />
                <Label htmlFor="auto_send" className="cursor-pointer font-semibold">Envoyer automatiquement au client</Label>
              </div>
              {invoiceForm.auto_send && (
                <div className="ml-6 flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="send_email"
                      checked={invoiceForm.send_email}
                      onCheckedChange={(val) => setInvoiceForm({ ...invoiceForm, send_email: !!val })}
                    />
                    <Label htmlFor="send_email" className="cursor-pointer">E-mail</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="send_whatsapp"
                      checked={invoiceForm.send_whatsapp}
                      onCheckedChange={(val) => setInvoiceForm({ ...invoiceForm, send_whatsapp: !!val })}
                    />
                    <Label htmlFor="send_whatsapp" className="cursor-pointer">WhatsApp</Label>
                  </div>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? 'Enregistrement...' : (invoiceDialogMode === 'create' ? 'Générer la facture' : 'Mettre à jour')}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardPageShell>
  );
}
