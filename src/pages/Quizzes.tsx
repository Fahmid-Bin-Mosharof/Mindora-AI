import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, Plus, Sparkles, Trash2, Trophy, Clock, Play } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { api, DocumentItem, Quiz, QuizAttempt } from '@/lib/api';
import { toast } from 'sonner';

export default function Quizzes() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  // form
  const [title, setTitle] = useState('');
  const [num, setNum] = useState(5);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [selected, setSelected] = useState<string[]>([]);

  const refresh = () => {
    api.listQuizzes().then(setQuizzes).catch(() => {});
    api.listAttempts().then(setAttempts).catch(() => {});
    api.listDocuments().then(setDocs).catch(() => {});
  };
  useEffect(() => { refresh(); }, []);

  const toggleDoc = (id: string) =>
    setSelected(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]));

  const generate = async () => {
    setGenerating(true);
    try {
      const quiz = await api.generateQuiz({
        title: title || undefined,
        documentIds: selected,
        numQuestions: num,
        difficulty,
      });
      setOpen(false);
      setTitle(''); setSelected([]); setNum(5); setDifficulty('medium');
      nav(`/quizzes/${quiz.id}/take`);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to generate quiz');
    } finally {
      setGenerating(false);
    }
  };

  const remove = async (id: string) => {
    try { await api.deleteQuiz(id); setQuizzes(q => q.filter(x => x.id !== id)); toast.success('Deleted'); }
    catch (e: any) { toast.error(e?.message ?? 'Failed'); }
  };

  return (
    <AppShell>
      <div className="max-w-6xl space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold flex items-center gap-2">
              <GraduationCap className="h-7 w-7 text-primary" />
              {t('quiz.title')}
            </h1>
            <p className="text-muted-foreground mt-1">{t('quiz.subtitle')}</p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground hover:opacity-90">
                <Plus className="h-4 w-4" /> {t('quiz.generate')}
              </Button>
            </DialogTrigger>
            <DialogContent className="glass max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  {t('quiz.new_title')}
                </DialogTitle>
                <DialogDescription>{t('quiz.new_subtitle')}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>{t('quiz.name_label')}</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={t('quiz.name_placeholder')} maxLength={100} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>{t('quiz.num_questions')}</Label>
                    <Select value={String(num)} onValueChange={v => setNum(Number(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[3, 5, 10, 15, 20].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('quiz.difficulty')}</Label>
                    <Select value={difficulty} onValueChange={v => setDifficulty(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">{t('quiz.easy')}</SelectItem>
                        <SelectItem value="medium">{t('quiz.medium')}</SelectItem>
                        <SelectItem value="hard">{t('quiz.hard')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('quiz.scope_docs')}</Label>
                  {docs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('quiz.no_docs_hint')}</p>
                  ) : (
                    <div className="max-h-44 overflow-auto rounded-lg border border-border/60 divide-y divide-border/40">
                      {docs.map(d => (
                        <label key={d.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-accent/40">
                          <Checkbox checked={selected.includes(d.id)} onCheckedChange={() => toggleDoc(d.id)} />
                          <span className="text-sm truncate">{d.filename}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {selected.length === 0 && docs.length > 0 && (
                    <p className="text-xs text-muted-foreground">{t('quiz.use_all')}</p>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)} disabled={generating}>{t('common.cancel')}</Button>
                <Button onClick={generate} disabled={generating} className="gradient-primary text-primary-foreground hover:opacity-90">
                  {generating ? t('quiz.generating') : t('quiz.start')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Quizzes grid */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{t('quiz.your_quizzes')}</h2>
          {quizzes.length === 0 ? (
            <Card className="glass p-10 text-center text-muted-foreground">{t('quiz.empty_quizzes')}</Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {quizzes.map(q => (
                <motion.div key={q.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="glass p-5 transition-smooth hover:border-primary/40 hover:-translate-y-0.5 group h-full flex flex-col">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <GraduationCap className="h-5 w-5" />
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => remove(q.id)} className="opacity-0 group-hover:opacity-100 transition-smooth text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="font-medium line-clamp-2" title={q.title}>{q.title}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 capitalize">{q.difficulty}</Badge>
                      <span>{t('quiz.questions_count', { count: q.questions.length })}</span>
                    </div>
                    <div className="mt-auto pt-4 flex gap-2">
                      <Button size="sm" className="gradient-primary text-primary-foreground hover:opacity-90 flex-1" onClick={() => nav(`/quizzes/${q.id}/take`)}>
                        <Play className="h-3.5 w-3.5" /> {t('quiz.start')}
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Attempts */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{t('quiz.recent_attempts')}</h2>
          {attempts.length === 0 ? (
            <Card className="glass p-8 text-center text-muted-foreground">{t('quiz.empty_attempts')}</Card>
          ) : (
            <div className="grid gap-3">
              {attempts.slice(0, 8).map(a => (
                <Card key={a.id} className="glass p-4 flex flex-wrap items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <p className="font-medium truncate">{a.quizTitle}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                      <span>{new Date(a.createdAt).toLocaleString()}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{Math.round(a.durationSec)}s</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-display font-bold text-primary">{a.score}%</p>
                    <p className="text-xs text-muted-foreground">{a.correct}/{a.total}</p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
