'use client';

import { useState, useTransition } from 'react';
import { saveNotificationPreferences } from '@/app/notificacoes/actions';
import { Bell, CalendarClock, BarChart2, AlertCircle, TrendingDown, TrendingUp } from 'lucide-react';

interface Props {
  initial: {
    daily_reminder: boolean;
    weekly_summary: boolean;
    budget_alert: boolean;
    fixed_expenses: boolean;
    fixed_income: boolean;
  } | null;
}

const ITEMS = [
  { key: 'daily_reminder',  label: 'Lembrete diário',    desc: 'Lembrete quando você não registrou nada no dia', icon: <Bell size={16} /> },
  { key: 'weekly_summary',  label: 'Resumo semanal',     desc: 'Resumo dos gastos todo domingo à noite',          icon: <BarChart2 size={16} /> },
  { key: 'budget_alert',    label: 'Alertas de orçamento', desc: 'Quando ultrapassar um limite de categoria',     icon: <AlertCircle size={16} /> },
  { key: 'fixed_expenses',  label: 'Despesas fixas',     desc: 'Lembrete 1 dia antes e no dia do vencimento',     icon: <TrendingDown size={16} /> },
  { key: 'fixed_income',    label: 'Receitas fixas',     desc: 'Aviso no dia da receita prevista',                icon: <TrendingUp size={16} /> },
] as const;

export function NotificationPreferences({ initial }: Props) {
  const defaults = initial ?? {
    daily_reminder: true,
    weekly_summary: true,
    budget_alert: true,
    fixed_expenses: true,
    fixed_income: true,
  };

  const [prefs, setPrefs] = useState(defaults);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const toggle = (key: keyof typeof prefs) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    setSaved(false);
    startTransition(async () => {
      await saveNotificationPreferences(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  return (
    <div className="space-y-3">
      {ITEMS.map(item => (
        <div key={item.key} className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground">
              {item.icon}
            </div>
            <div>
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          </div>
          <button
            onClick={() => toggle(item.key)}
            disabled={isPending}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
              prefs[item.key] ? 'bg-primary' : 'bg-secondary'
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                prefs[item.key] ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>

        </div>
      ))}
      {saved && (
        <p className="text-xs text-green-400 text-center animate-in fade-in">✓ Preferências salvas</p>
      )}
    </div>
  );
}
