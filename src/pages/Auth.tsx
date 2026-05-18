import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { login, signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'signup') await signup(name, email, password);
      else await login(email, password);
      nav('/dashboard');
    } catch (err: any) {
      toast.error(err?.message ?? 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: Brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-10 border-r border-border/50 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-hero" />
        <div className="absolute inset-0 -z-10 bg-gradient-glow opacity-60" />
        <Logo />
        <div className="space-y-4 max-w-md">
          <h2 className="font-display text-4xl font-bold leading-tight">
            <span className="gradient-text">{t('brand.tagline')}</span>
          </h2>
          <p className="text-muted-foreground text-lg">{t('landing.hero_subtitle')}</p>
        </div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Mindora AI</p>
      </div>

      {/* Right: Form */}
      <div className="flex flex-col">
        <header className="flex items-center justify-between p-6">
          <div className="lg:hidden"><Logo /></div>
          <div className="ml-auto"><LanguageToggle /></div>
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm">
            <h1 className="font-display text-3xl font-bold mb-1">
              {mode === 'login' ? t('auth.login_title') : t('auth.signup_title')}
            </h1>
            <p className="text-muted-foreground mb-8">
              {mode === 'login' ? t('auth.login_subtitle') : t('auth.signup_subtitle')}
            </p>

            <form onSubmit={submit} className="space-y-4">
              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">{t('auth.name')}</Label>
                  <Input id="name" value={name} onChange={e => setName(e.target.value)} required autoComplete="name" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
              </div>
              <Button type="submit" disabled={busy} className="w-full gradient-primary text-primary-foreground hover:opacity-90 glow-primary h-11">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === 'login' ? t('auth.submit_login') : t('auth.submit_signup')}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {mode === 'login' ? t('auth.no_account') : t('auth.have_account')}{' '}
              <Link to={mode === 'login' ? '/signup' : '/login'} className="text-primary hover:underline">
                {mode === 'login' ? t('nav.signup') : t('nav.login')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export const Login = () => <AuthPage mode="login" />;
export const Signup = () => <AuthPage mode="signup" />;
