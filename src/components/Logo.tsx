import { Link } from 'react-router-dom';
import { Brain } from 'lucide-react';

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'text-lg', md: 'text-xl', lg: 'text-2xl' };
  return (
    <Link to="/" className="flex items-center gap-2 group">
      <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary glow-primary transition-smooth group-hover:scale-105">
        <Brain className="h-5 w-5 text-primary-foreground" />
      </div>
      <span className={`font-display font-bold gradient-text ${sizes[size]}`}>Mindora</span>
    </Link>
  );
}
