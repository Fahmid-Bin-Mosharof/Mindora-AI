import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowRight, BookOpen, MessageSquare, Sparkles, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useAuth } from '@/contexts/AuthContext';

export default function Landing() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const features = [
    { icon: MessageSquare, key: 'rag' },
    { icon: Sparkles, key: 'quiz' },
    { icon: BookOpen, key: 'library' },
    { icon: BarChart3, key: 'dash' },
  ] as const;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/60 border-b border-border/50">
        <div className="container flex h-16 items-center justify-between">
          <Logo />
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-smooth">{t('nav.features')}</a>
            <a href="#how" className="hover:text-foreground transition-smooth">{t('nav.how')}</a>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            {user ? (
              <Button asChild size="sm" className="gradient-primary text-primary-foreground hover:opacity-90">
                <Link to="/dashboard">{t('nav.dashboard')}</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm"><Link to="/login">{t('nav.login')}</Link></Button>
                <Button asChild size="sm" className="gradient-primary text-primary-foreground hover:opacity-90 glow-primary">
                  <Link to="/signup">{t('nav.signup')}</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="container py-20 md:py-32 text-center max-w-4xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                {t('landing.hero_eyebrow')}
              </span>
              <h1 className="mt-6 font-display text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight">
                {t('landing.hero_title_1')}<br />
                <span className="gradient-text">{t('landing.hero_title_2')}</span>
              </h1>
              <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                {t('landing.hero_subtitle')}
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="gradient-primary text-primary-foreground hover:opacity-90 glow-primary h-12 px-8 text-base">
                  <Link to={user ? '/dashboard' : '/signup'}>
                    {t('landing.cta_primary')} <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base glass">
                  <a href="#features">{t('landing.cta_secondary')}</a>
                </Button>
              </div>
              <p className="mt-6 text-sm text-muted-foreground">{t('landing.trust')}</p>
            </motion.div>
          </div>
          <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-glow opacity-60" />
        </section>

        {/* Features */}
        <section id="features" className="container py-20">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, key }, i) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass rounded-xl p-6 transition-smooth hover:border-primary/40 hover:-translate-y-1"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg font-semibold mb-2">
                  {t(`landing.feature_${key}_title`)}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t(`landing.feature_${key}_desc`)}
                </p>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border/50 py-8">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <Logo size="sm" />
          <p>© {new Date().getFullYear()} Mindora AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
