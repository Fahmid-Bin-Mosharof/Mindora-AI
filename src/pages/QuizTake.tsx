import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Clock, Trophy, X, RefreshCw } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { api, Quiz, QuizAttempt } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function QuizTake() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [current, setCurrent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [seconds, setSeconds] = useState(0);
  const startedAt = useRef<number>(Date.now());

  useEffect(() => {
    if (!id) return;
    api.getQuiz(id)
      .then(q => { setQuiz(q); setAnswers(new Array(q.questions.length).fill(-1)); })
      .catch(e => { toast.error(e?.message ?? 'Failed'); nav('/quizzes'); });
  }, [id, nav]);

  useEffect(() => {
    if (attempt) return;
    const t = setInterval(() => setSeconds(Math.floor((Date.now() - startedAt.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [attempt]);

  const q = quiz?.questions[current];
  const progress = useMemo(() => quiz ? ((current + 1) / quiz.questions.length) * 100 : 0, [quiz, current]);

  const setAnswer = (idx: number) => {
    setAnswers(a => { const copy = [...a]; copy[current] = idx; return copy; });
  };

  const submit = async () => {
    if (!quiz) return;
    setSubmitting(true);
    try {
      const a = await api.submitAttempt({
        quizId: quiz.id,
        answers,
        durationSec: Math.max(1, Math.floor((Date.now() - startedAt.current) / 1000)),
      });
      setAttempt(a);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const retake = () => {
    if (!quiz) return;
    setAnswers(new Array(quiz.questions.length).fill(-1));
    setCurrent(0);
    setAttempt(null);
    setSeconds(0);
    startedAt.current = Date.now();
  };

  if (!quiz) {
    return <AppShell><div className="text-muted-foreground">{t('common.loading')}</div></AppShell>;
  }

  // RESULTS VIEW
  if (attempt) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto space-y-6">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="glass p-8 text-center">
              <div className="mx-auto h-16 w-16 rounded-full gradient-primary flex items-center justify-center mb-4">
                <Trophy className="h-8 w-8 text-primary-foreground" />
              </div>
              <h1 className="font-display text-3xl font-bold">{t('quiz.result_title')}</h1>
              <p className="text-muted-foreground mt-1">{quiz.title}</p>
              <p className="font-display text-6xl font-bold mt-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {attempt.score}%
              </p>
              <p className="text-muted-foreground mt-2">
                {t('quiz.result_score', { correct: attempt.correct, total: attempt.total })}
              </p>
              <div className="flex items-center justify-center gap-3 mt-6">
                <Button variant="outline" asChild><Link to="/quizzes"><ArrowLeft className="h-4 w-4" />{t('quiz.back_to_quizzes')}</Link></Button>
                <Button onClick={retake} className="gradient-primary text-primary-foreground hover:opacity-90">
                  <RefreshCw className="h-4 w-4" />{t('quiz.retake_quiz')}
                </Button>
              </div>
            </Card>
          </motion.div>

          <div className="space-y-3">
            {quiz.questions.map((qq, i) => {
              const userIdx = attempt.answers[i];
              const isCorrect = userIdx === qq.correctIndex;
              return (
                <Card key={qq.id} className="glass p-5">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'mt-0.5 h-7 w-7 shrink-0 rounded-full flex items-center justify-center',
                      isCorrect ? 'bg-primary/15 text-primary' : 'bg-destructive/15 text-destructive',
                    )}>
                      {isCorrect ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{i + 1}. {qq.question}</p>
                      <div className="mt-3 grid gap-1.5">
                        {qq.options.map((opt, idx) => (
                          <div key={idx} className={cn(
                            'rounded-md border px-3 py-2 text-sm flex items-center gap-2',
                            idx === qq.correctIndex && 'border-primary/40 bg-primary/5 text-foreground',
                            idx === userIdx && idx !== qq.correctIndex && 'border-destructive/40 bg-destructive/5',
                            idx !== qq.correctIndex && idx !== userIdx && 'border-border/50 text-muted-foreground',
                          )}>
                            {idx === qq.correctIndex && <Check className="h-3.5 w-3.5 text-primary" />}
                            {idx === userIdx && idx !== qq.correctIndex && <X className="h-3.5 w-3.5 text-destructive" />}
                            <span>{opt}</span>
                          </div>
                        ))}
                      </div>
                      {qq.explanation && (
                        <p className="text-sm text-muted-foreground mt-3">
                          <span className="text-foreground font-medium">{t('quiz.explanation')}: </span>{qq.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </AppShell>
    );
  }

  // TAKING VIEW
  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold line-clamp-1">{quiz.title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t('quiz.question_n', { current: current + 1, total: quiz.questions.length })}
            </p>
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
          </Badge>
        </div>

        <Progress value={progress} className="h-1.5" />

        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="glass p-6 sm:p-8">
              <p className="font-display text-xl font-medium leading-snug">{q!.question}</p>

              <RadioGroup
                value={answers[current] >= 0 ? String(answers[current]) : ''}
                onValueChange={v => setAnswer(Number(v))}
                className="mt-6 space-y-2"
              >
                {q!.options.map((opt, idx) => (
                  <Label
                    key={idx}
                    htmlFor={`opt-${idx}`}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-smooth',
                      answers[current] === idx
                        ? 'border-primary bg-primary/5'
                        : 'border-border/60 hover:border-primary/40 hover:bg-accent/40',
                    )}
                  >
                    <RadioGroupItem value={String(idx)} id={`opt-${idx}`} />
                    <span className="text-sm">{opt}</span>
                  </Label>
                ))}
              </RadioGroup>
            </Card>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" disabled={current === 0} onClick={() => setCurrent(c => c - 1)}>
            <ArrowLeft className="h-4 w-4" /> {t('quiz.prev')}
          </Button>

          <div className="flex items-center gap-2">
            {current < quiz.questions.length - 1 ? (
              <Button onClick={() => setCurrent(c => c + 1)} className="gradient-primary text-primary-foreground hover:opacity-90">
                {t('quiz.next')} <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={submit} disabled={submitting} className="gradient-primary text-primary-foreground hover:opacity-90">
                {submitting ? t('quiz.submitting') : t('quiz.submit')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
