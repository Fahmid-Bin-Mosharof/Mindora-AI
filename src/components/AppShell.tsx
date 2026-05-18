import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, BookOpen, Upload, User, LogOut, Sparkles, GraduationCap } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const items = [
    { to: '/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
    { to: '/chat',      icon: Sparkles,        label: t('nav.chat') },
    { to: '/quizzes',   icon: GraduationCap,   label: t('nav.quizzes') },
    { to: '/library',   icon: BookOpen,        label: t('nav.library') },
    { to: '/upload',    icon: Upload,          label: t('nav.upload') },
    { to: '/profile',   icon: User,            label: t('nav.profile') },
  ];

  const initials = (user?.name ?? 'U').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-sidebar-border bg-sidebar p-4">
        <div className="mb-8 px-2"><Logo /></div>
        <nav className="flex-1 space-y-1">
          {items.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-smooth',
                isActive
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <Button variant="ghost" onClick={() => { logout(); nav('/'); }} className="justify-start gap-3 text-muted-foreground hover:text-foreground">
          <LogOut className="h-4 w-4" />
          {t('nav.logout')}
        </Button>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/50 bg-background/60 backdrop-blur-xl px-6">
          <div className="md:hidden"><Logo size="sm" /></div>
          <div className="ml-auto flex items-center gap-3">
            <LanguageToggle />
            <Avatar className="h-9 w-9 border border-primary/30">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/50 bg-background/90 backdrop-blur-xl flex justify-around py-2">
          {items.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => cn(
              'flex flex-col items-center gap-1 px-3 py-1 text-xs',
              isActive ? 'text-primary' : 'text-muted-foreground',
            )}>
              <Icon className="h-5 w-5" />
              <span className="text-[10px]">{label}</span>
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 p-6 pb-24 md:pb-6">{children}</main>
      </div>
    </div>
  );
}
