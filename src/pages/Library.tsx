import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { FileText, Search, Trash2, UploadCloud } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, DocumentItem } from '@/lib/api';
import { toast } from 'sonner';

export default function Library() {
  const { t } = useTranslation();
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [q, setQ] = useState('');

  const refresh = () => api.listDocuments().then(setDocs).catch(() => {});
  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(
    () => docs.filter(d => d.filename.toLowerCase().includes(q.toLowerCase())),
    [docs, q],
  );

  const remove = async (id: string) => {
    try { await api.deleteDocument(id); setDocs(d => d.filter(x => x.id !== id)); toast.success('Deleted'); }
    catch (e: any) { toast.error(e?.message ?? 'Failed'); }
  };

  return (
    <AppShell>
      <div className="max-w-6xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold">{t('library.title')}</h1>
            <p className="text-muted-foreground mt-1">{t('library.subtitle')}</p>
          </div>
          <Button asChild className="gradient-primary text-primary-foreground hover:opacity-90">
            <Link to="/upload"><UploadCloud className="h-4 w-4" />{t('nav.upload')}</Link>
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder={t('library.search')} className="pl-9" />
        </div>

        {filtered.length === 0 ? (
          <Card className="glass p-12 text-center">
            <p className="text-muted-foreground mb-4">{t('library.empty')}</p>
            <Button asChild className="gradient-primary text-primary-foreground hover:opacity-90">
              <Link to="/upload">{t('library.upload_cta')}</Link>
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(d => (
              <Card key={d.id} className="glass p-5 transition-smooth hover:border-primary/40 hover:-translate-y-0.5 group">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove(d.id)} className="opacity-0 group-hover:opacity-100 transition-smooth text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="font-medium truncate" title={d.filename}>{d.filename}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(d.size / 1024).toFixed(1)} KB · {new Date(d.createdAt).toLocaleDateString()}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
