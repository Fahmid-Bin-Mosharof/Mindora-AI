import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function LanguageToggle() {
  const { i18n, t } = useTranslation();
  const change = (lng: 'en' | 'bn') => i18n.changeLanguage(lng);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{i18n.language === 'bn' ? 'বাংলা' : 'EN'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass-strong">
        <DropdownMenuItem onClick={() => change('en')}>{t('common.english')}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => change('bn')}>{t('common.bengali')}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
