import { FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, FileText, MessageSquare, GraduationCap, Trophy, LogOut, Trash2, Calendar } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join('') || '?';
}

export default function Profile() {
  const { t, i18n } = useTranslation();
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name ?? '');
  const [language, setLanguage] = useState<'en' | 'bn'>((user?.language as 'en' | 'bn') ?? (i18n.language as 'en' | 'bn'));
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState({ docs: 0, chats: 0, quizzes: 0, avg: 0 });
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [d, s, a] = await Promise.all([
          api.listDocuments().catch(() => []),
          api.listSessions().catch(() => [] as any[]),
          api.listAttempts().catch(() => [] as any[]),
        ]);
        const avg = a.length ? Math.round((a as any[]).reduce((x: number, y: any) => x + y.score, 0) / a.length) : 0;
        setStats({ docs: d.length, chats: s.length, quizzes: a.length, avg });
      } catch { /* ignore */ }
    })();
  }, []);

  if (!user) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { user: u } = await api.updateProfile({ name, language });
      setUser(u);
      i18n.changeLanguage(language);
      toast.success(t('profile.saved'));
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const clearChats = async () => {
    setClearing(true);
    try {
      await api.clearAllSessions();
      setStats(s => ({ ...s, chats: 0 }));
      toast.success(t('profile.chats_cleared'));
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed');
    } finally {
      setClearing(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const memberSince = new Date(user.createdAt).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const statCards = [
    { icon: FileText,      label: t('dashboard.stat_docs'),     value: stats.docs },
    { icon: MessageSquare, label: t('profile.chats_count'),     value: stats.chats },
    { icon: GraduationCap, label: t('dashboard.stat_quizzes'),  value: stats.quizzes },
    { icon: Trophy,        label: t('dashboard.stat_avg'),      value: stats.quizzes ? `${stats.avg}%` : '—' },
  ];

  return (
    <AppShell>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold">{t('profile.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('profile.subtitle')}</p>
        </div>

        {/* Identity card */}
        <Card className="glass p-6">
          <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
            <Avatar className="h-20 w-20 ring-2 ring-primary/40 shadow-[0_0_30px_-5px_hsl(var(--primary)/0.5)]">
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-2xl font-display font-bold">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-2xl font-bold truncate">{user.name}</h2>
              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline" className="border-primary/30 text-primary gap-1">
                  <Calendar className="h-3 w-3" />
                  {t('profile.member_since', { date: memberSince })}
                </Badge>
                <Badge variant="outline" className="border-accent/30 text-accent">
                  {language === 'bn' ? t('common.bengali') : t('common.english')}
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {statCards.map(({ icon: Icon, label, value }) => (
            <Card key={label} className="glass p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-display font-bold leading-none">{value}</div>
                  <div className="text-[11px] text-muted-foreground mt-1 truncate">{label}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Edit form */}
        <Card className="glass p-6">
          <h3 className="font-display text-lg font-semibold mb-4">{t('profile.edit_section')}</h3>
          <form onSubmit={submit} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">{t('profile.name')}</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>{t('profile.email')}</Label>
                <Input value={user.email} disabled />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t('profile.language')}</Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as 'en' | 'bn')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t('common.english')}</SelectItem>
                  <SelectItem value="bn">{t('common.bengali')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={busy} className="gradient-primary text-primary-foreground hover:opacity-90 glow-primary">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('profile.save')}
            </Button>
          </form>
        </Card>

        {/* Danger zone */}
        <Card className="glass p-6 border-destructive/30">
          <h3 className="font-display text-lg font-semibold text-destructive mb-1">{t('profile.danger_zone')}</h3>
          <p className="text-xs text-muted-foreground mb-4">{t('profile.danger_sub')}</p>

          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border/60 p-4">
              <div>
                <p className="text-sm font-medium">{t('profile.clear_chats')}</p>
                <p className="text-xs text-muted-foreground">{t('profile.clear_chats_sub')}</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10" disabled={clearing || stats.chats === 0}>
                    {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    {t('profile.clear_chats')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="glass-strong">
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('profile.clear_chats_confirm_title')}</AlertDialogTitle>
                    <AlertDialogDescription>{t('profile.clear_chats_confirm_sub')}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={clearChats} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      {t('common.confirm')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border/60 p-4">
              <div>
                <p className="text-sm font-medium">{t('profile.signout')}</p>
                <p className="text-xs text-muted-foreground">{t('profile.signout_sub')}</p>
              </div>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                {t('nav.logout')}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
