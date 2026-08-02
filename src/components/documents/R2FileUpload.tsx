import { FormEvent, useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { documentsApi, extractApiErrorMessage } from '@/services/api';

interface UploadedDocument {
  data?: {
    id?: string;
    nom?: string;
    type?: string;
  };
}

interface R2FileUploadProps {
  dossierId: string;
  typeDocument: string;
  accept?: string;
  disabled?: boolean;
  onSuccess?: (response: UploadedDocument) => void;
  onError?: (message: string) => void;
  /** Si true, enveloppe le contenu dans un <form> avec submit */
  asForm?: boolean;
  className?: string;
}

export function R2FileUpload({
  dossierId,
  typeDocument,
  accept = '.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx',
  disabled = false,
  onSuccess,
  onError,
  asForm = true,
  className = '',
}: R2FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = Boolean(dossierId && typeDocument && file && !loading && !disabled);

  const handleUpload = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!canSubmit || !file) return;

    setLoading(true);
    setError('');
    try {
      const res = await documentsApi.upload(dossierId, file, typeDocument);
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onSuccess?.(res.data as UploadedDocument);
    } catch (err) {
      const message = await extractApiErrorMessage(err, "L'upload a échoué.");
      setError(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  };

  const inner = (
    <div className={`space-y-3 ${className}`}>
      <div className="space-y-1.5">
        <Label>Fichier</Label>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          disabled={disabled || loading}
          onChange={(ev) => setFile(ev.target.files?.[0] ?? null)}
          className="block w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
        />
        {file && (
          <p className="text-xs text-muted-foreground">
            {file.name} ({Math.round(file.size / 1024)} Ko)
          </p>
        )}
      </div>
      <Button type={asForm ? 'submit' : 'button'} className="w-full" disabled={!canSubmit} onClick={asForm ? undefined : () => void handleUpload()}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Envoi vers le stockage...
          </>
        ) : (
          <>
            <Upload size={16} className="mr-2" />
            Envoyer
          </>
        )}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );

  if (asForm) {
    return <form onSubmit={handleUpload}>{inner}</form>;
  }

  return inner;
}
