import { useRef, useState, DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, Loader2 } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const ALLOWED = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
const MAX = 20 * 1024 * 1024;

export default function UploadPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);

  const handle = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setBusy(true);
    try {
      for (const f of Array.from(files)) {
        if (f.size > MAX) { toast.error(`${f.name}: > 20 MB`); continue; }
        if (ALLOWED.length && !ALLOWED.includes(f.type) && !/\.(pdf|docx|txt)$/i.test(f.name)) {
          toast.error(`${f.name}: unsupported type`); continue;
        }
        await api.uploadDocument(f);
        toast.success(`${f.name} — ${t('upload.success')}`);
      }
      nav('/library');
    } catch (e: any) {
      toast.error(e?.message ?? t('upload.error'));
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault(); setDrag(false);
    handle(e.dataTransfer.files);
  };

  return (
    <AppShell>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold">{t('upload.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('upload.subtitle')}</p>
        </div>

        <Card
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'glass cursor-pointer p-12 text-center transition-smooth border-2 border-dashed',
            drag ? 'border-primary glow-primary' : 'border-border hover:border-primary/50',
            busy && 'pointer-events-none opacity-60',
          )}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={e => handle(e.target.files)}
          />
          <div className="flex flex-col items-center gap-3">
            {busy ? (
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UploadCloud className="h-8 w-8" />
              </div>
            )}
            <div>
              <p className="font-display text-lg font-semibold">
                {busy ? t('upload.uploading') : t('upload.drop')}
              </p>
              {!busy && <p className="text-sm text-muted-foreground mt-1">{t('upload.or_browse')}</p>}
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
