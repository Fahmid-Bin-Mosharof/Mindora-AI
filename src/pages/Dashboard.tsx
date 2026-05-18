import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, MessageSquare, Sparkles, TrendingUp, Flame, Trophy, Clock, GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { api, DocumentItem, Quiz, QuizAttempt, ChatSession } from '@/lib/api';

const DIFF_COLORS: Record<string, string> = {
  easy:   'hsl(var(--primary))',
  medium: 'hsl(var(--accent))',
  hard:   'hsl(var(--destructive))',
};

function lastNDays(n: number) {
  const days: { key: string; label: string; date: Date }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push({
      key: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString(undefined, { weekday: 'short' }),
      date: d,
    });
  }
  return days;
}

function computeStreak(attempts: QuizAttempt[]) {
  if (!attempts.length) return 0;
  const days = new Set(attempts.map(a => a.createdAt.slice(0, 10)));
  let streak = 0;
  const cur = new Date();
  cur.setHours(0, 0, 0, 0);
  // Allow today missing — start from today; if today has none, check yesterday onwards.
  if (!days.has(cur.toISOString().slice(0, 10))) cur.setDate(cur.getDate() - 1);
  while (days.has(cur.toISOString().slice(0, 10))) {
    streak++;
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [d, q, a, s] = await Promise.all([
          api.listDocuments().catch(() => []),
          api.listQuizzes().catch(() => []),
          api.listAttempts().catch(() => []),
          api.listSessions().catch(() => []),
        ]);
        setDocs(d); setQuizzes(q); setAttempts(a); setSessions(s);
      } finally { setLoading(false); }
    })();
  }, []);

  const avgScore = attempts.length
    ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length)
    : 0;
  const bestScore = attempts.reduce((m, a) => Math.max(m, a.score), 0);
  const totalTimeMin = Math.round(attempts.reduce((s, a) => s + a.durationSec, 0) / 60);
  const streak = computeStreak(attempts);
  const questionsAsked = sessions.length; // proxy — without per-session message counts loaded

  const stats = [
    { icon: FileText,      label: t('dashboard.stat_docs'),      value: docs.length,           tint: 'text-primary',     bg: 'bg-primary/10' },
    { icon: MessageSquare, label: t('dashboard.stat_questions'), value: questionsAsked,        tint: 'text-accent',      bg: 'bg-accent/10' },
    { icon: GraduationCap, label: t('dashboard.stat_quizzes'),   value: attempts.length,       tint: 'text-primary',     bg: 'bg-primary/10' },
    { icon: TrendingUp,    label: t('dashboard.stat_avg'),       value: attempts.length ? `${avgScore}%` : '—', tint: 'text-accent', bg: 'bg-accent/10' },
  ];

  const scoreSeries = useMemo(() => {
    return [...attempts]
      .slice()
      .reverse()
      .slice(-12)
      .map((a, i) => ({
        idx: i + 1,
        score: a.score,
        label: new Date(a.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        title: a.quizTitle,
      }));
  }, [attempts]);

  const activitySeries = useMemo(() => {
    const days = lastNDays(7);
    const counts = new Map(days.map(d => [d.key, 0]));
    attempts.forEach(a => {
      const k = a.createdAt.slice(0, 10);
      if (counts.has(k)) counts.set(k, (counts.get(k) || 0) + 1);
    });
    return days.map(d => ({ day: d.label, attempts: counts.get(d.key) || 0 }));
  }, [attempts]);

  const difficultyData = useMemo(() => {
    const counts = { easy: 0, medium: 0, hard: 0 } as Record<string, number>;
    quizzes.forEach(q => { counts[q.difficulty] = (counts[q.difficulty] || 0) + 1; });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ name: t(`quiz.${k}`), key: k, value: v }));
  }, [quizzes, t]);

  return (
    <AppShell>
      <div className="space-y-8 max-w-6xl">
        <div>
          <h1 className="font-display text-3xl font-bold">
            {t('dashboard.welcome', { name: user?.name ?? '' })}
          </h1>
          <p className="text-muted-foreground mt-1">{t('dashboard.subtitle')}</p>
        </div>

        {/* KPI cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(({ icon: Icon, label, value, tint, bg }) => (
            <Card key={label} className="glass p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg} ${tint}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="text-2xl font-display font-bold">{value}</div>
              <div className="text-xs text-muted-foreground mt-1">{label}</div>
            </Card>
          ))}
        </div>

        {/* Highlights */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="glass p-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Flame className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xl font-display font-bold">{streak} {t('dashboard.days')}</div>
              <div className="text-xs text-muted-foreground">{t('dashboard.streak')}</div>
            </div>
          </Card>
          <Card className="glass p-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xl font-display font-bold">{attempts.length ? `${bestScore}%` : '—'}</div>
              <div className="text-xs text-muted-foreground">{t('dashboard.best_score')}</div>
            </div>
          </Card>
          <Card className="glass p-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xl font-display font-bold">{totalTimeMin} {t('dashboard.minutes')}</div>
              <div className="text-xs text-muted-foreground">{t('dashboard.study_time')}</div>
            </div>
          </Card>
        </div>

        {/* Charts row */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="glass p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-lg font-semibold">{t('dashboard.score_trend')}</h2>
                <p className="text-xs text-muted-foreground">{t('dashboard.score_trend_sub')}</p>
              </div>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                {scoreSeries.length} {t('dashboard.attempts')}
              </Badge>
            </div>
            {scoreSeries.length === 0 ? (
              <EmptyChart text={t('dashboard.no_attempts')} />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={scoreSeries} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                      formatter={(v: number) => [`${v}%`, t('dashboard.score')]}
                    />
                    <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#scoreFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card className="glass p-5">
            <div className="mb-4">
              <h2 className="font-display text-lg font-semibold">{t('dashboard.difficulty_mix')}</h2>
              <p className="text-xs text-muted-foreground">{t('dashboard.difficulty_sub')}</p>
            </div>
            {difficultyData.length === 0 ? (
              <EmptyChart text={t('dashboard.no_quizzes')} />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={difficultyData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {difficultyData.map(d => (
                        <Cell key={d.key} fill={DIFF_COLORS[d.key]} stroke="hsl(var(--background))" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>

        {/* Activity chart */}
        <Card className="glass p-5">
          <div className="mb-4">
            <h2 className="font-display text-lg font-semibold">{t('dashboard.weekly_activity')}</h2>
            <p className="text-xs text-muted-foreground">{t('dashboard.weekly_activity_sub')}</p>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activitySeries} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="attempts" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Recent activity + Recent docs */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="glass p-6">
            <h2 className="font-display text-lg font-semibold mb-4">{t('dashboard.recent_attempts')}</h2>
            {attempts.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-muted-foreground mb-4">{t('dashboard.no_attempts')}</p>
                <Button asChild className="gradient-primary text-primary-foreground hover:opacity-90">
                  <Link to="/quizzes">{t('quiz.generate')}</Link>
                </Button>
              </div>
            ) : (
              <ul className="divide-y divide-border/50">
                {attempts.slice(0, 5).map(a => (
                  <li key={a.id} className="flex items-center gap-3 py-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{a.quizTitle}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(a.createdAt).toLocaleDateString()} · {a.correct}/{a.total}
                      </p>
                    </div>
                    <Badge
                      className={
                        a.score >= 80 ? 'bg-primary/15 text-primary border-primary/30'
                        : a.score >= 50 ? 'bg-accent/15 text-accent border-accent/30'
                        : 'bg-destructive/15 text-destructive border-destructive/30'
                      }
                      variant="outline"
                    >
                      {a.score}%
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="glass p-6">
            <h2 className="font-display text-lg font-semibold mb-4">{t('dashboard.recent_docs')}</h2>
            {docs.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-muted-foreground mb-4">{t('dashboard.no_docs')}</p>
                <Button asChild className="gradient-primary text-primary-foreground hover:opacity-90">
                  <Link to="/upload">{t('nav.upload')}</Link>
                </Button>
              </div>
            ) : (
              <ul className="divide-y divide-border/50">
                {docs.slice(0, 5).map(d => (
                  <li key={d.id} className="flex items-center gap-3 py-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{d.filename}</p>
                      <p className="text-xs text-muted-foreground">{(d.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="h-64 flex items-center justify-center text-sm text-muted-foreground border border-dashed border-border/60 rounded-lg">
      {text}
    </div>
  );
}
