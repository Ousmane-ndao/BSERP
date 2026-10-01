import { useEffect, useRef, useState } from 'react';
import { Loader2, Mail, MessageCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { extractApiErrorMessage, invoicesApi } from '@/services/api';

export type InvoiceSendMode = 'email' | 'whatsapp' | 'both';

export interface InvoiceSendTarget {
  id: string;
  numero: string;
  clientId: string;
  clientName?: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
}

interface Preview {
  invoiceId: string;
  invoiceNumero: string;
  clientId: string;
  clientName: string;
  email: string | null;
  phone: string | null;
  emailValid: boolean;
  whatsappId: string | null;
  history: Array<{
    id: string;
    channel: string;
    status: string;
    recipient: string | null;
    errorMessage: string | null;
    sentAt: string | null;
  }>;
}

interface DispatchResult {
  id?: string;
  ok: boolean;
  channel: string;
  label: string;
  status: string;
  errorMessage?: string | null;
}

interface InvoiceSendDialogProps {
  invoice: InvoiceSendTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onError: (message: string) => void;
}

function channelLabel(channel: string): string {
  if (channel === 'email') return 'E-mail';
  if (channel === 'whatsapp') return 'WhatsApp';
  if (channel === 'internal') return 'E-mail interne';
  return channel;
}

export function InvoiceSendDialog({ invoice, open, onOpenChange, onError }: InvoiceSendDialogProps) {
  const [mode, setMode] = useState<InvoiceSendMode>('email');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [results, setResults] = useState<DispatchResult[] | null>(null);
  const sendingLock = useRef(false);

  useEffect(() => {
    if (!open || !invoice) {
      setPreview(null);
      setResults(null);
      setMode('email');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setResults(null);
    void invoicesApi
      .deliveryPreview(invoice.id)
      .then((res) => {
        if (cancelled) return;
        const data = (res.data?.data ?? null) as Preview | null;
        setPreview(
          data ?? {
            invoiceId: invoice.id,
            invoiceNumero: invoice.numero,
            clientId: invoice.clientId,
            clientName: invoice.clientName ?? '',
            email: invoice.clientEmail ?? null,
            phone: invoice.clientPhone ?? null,
            emailValid: Boolean(invoice.clientEmail),
            whatsappId: null,
            history: [],
          },
        );
      })
      .catch(() => {
        if (cancelled) return;
        setPreview({
          invoiceId: invoice.id,
          invoiceNumero: invoice.numero,
          clientId: invoice.clientId,
          clientName: invoice.clientName ?? '',
          email: invoice.clientEmail ?? null,
          phone: invoice.clientPhone ?? null,
          emailValid: Boolean(invoice.clientEmail),
          whatsappId: null,
          history: [],
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, invoice, onError]);

  const handleSend = async () => {
    if (!invoice || !preview || sendingLock.current) return;
    if (String(preview.clientId) !== String(invoice.clientId)) {
      onError('Cette facture n’appartient pas au client affiché. Envoi annulé.');
      return;
    }
    sendingLock.current = true;
    setSending(true);
    setResults(null);
    try {
      const res = await invoicesApi.deliver(invoice.id, mode);
      const payload = res.data?.data as { results?: DispatchResult[] } | undefined;
      setResults(payload?.results ?? []);
      const refreshed = await invoicesApi.deliveryPreview(invoice.id);
      setPreview((refreshed.data?.data ?? preview) as Preview);
    } catch (err: unknown) {
      onError(await extractApiErrorMessage(err, "Impossible d'envoyer la facture."));
    } finally {
      sendingLock.current = false;
      setSending(false);
    }
  };

  const resultIds = new Set((results ?? []).map((r) => r.id).filter(Boolean));
  const olderHistory = (preview?.history ?? []).filter((h) => !resultIds.has(h.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Envoyer la facture</DialogTitle>
          <DialogDescription>
            {invoice ? `Facture ${invoice.numero}` : 'Facture'} — destinataire issu de la fiche client.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement des coordonnées…
          </p>
        )}

        {!loading && preview && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <p className="font-medium text-foreground">{preview.clientName || 'Client'}</p>
              <p className="mt-1 text-muted-foreground">
                E-mail : {preview.email ?? 'non renseigné'}
                {preview.email && !preview.emailValid ? ' (invalide)' : ''}
              </p>
              <p className="text-muted-foreground">Téléphone : {preview.phone ?? 'non renseigné'}</p>
            </div>

            <div className="space-y-2">
              <Label>Mode d’envoi</Label>
              <RadioGroup value={mode} onValueChange={(v) => setMode(v as InvoiceSendMode)} className="gap-2">
                <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm">
                  <RadioGroupItem value="email" id="send-email" />
                  <Mail className="h-4 w-4" />
                  E-mail
                </label>
                <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm">
                  <RadioGroupItem value="whatsapp" id="send-wa" />
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </label>
                <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm">
                  <RadioGroupItem value="both" id="send-both" />
                  <Send className="h-4 w-4" />
                  E-mail et WhatsApp
                </label>
              </RadioGroup>
            </div>

            {results && results.length > 0 && (
              <ul className="space-y-1.5 text-sm">
                {results.map((r) => {
                  const name = channelLabel(r.channel);
                  const detail = r.ok
                    ? `${name} : ✅ Envoyé`
                    : `${name} : ❌ Échec — ${r.errorMessage || r.label.replace(/^[^—]+—\s*/, '') || 'échec'}`;
                  return (
                    <li key={r.id ?? `${r.channel}-${r.status}`} className={r.ok ? 'text-emerald-700' : 'text-destructive'}>
                      {detail}
                    </li>
                  );
                })}
              </ul>
            )}

            {olderHistory.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Historique</p>
                <ul className="max-h-32 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                  {olderHistory.map((h) => (
                    <li key={h.id}>
                      {h.sentAt} · {channelLabel(h.channel)} ·{' '}
                      {h.status === 'sent' ? 'envoyé' : 'échec'}
                      {h.recipient ? ` · ${h.recipient}` : ''}
                      {h.errorMessage ? ` — ${h.errorMessage}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button type="button" className="w-full" onClick={() => void handleSend()} disabled={sending}>
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Envoi…
                </>
              ) : (
                'Confirmer l’envoi'
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
