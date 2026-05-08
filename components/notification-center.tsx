'use client';

import { useState, useTransition } from 'react';
import { Bell, Trash2, CheckCheck, AlertCircle, CalendarClock, TrendingDown, TrendingUp, MessageSquare, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppNotification, dismissNotification, dismissAll, markAsRead, markAllAsRead } from '@/app/notificacoes/actions';
import { useRouter } from 'next/navigation';

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  DAILY_REMINDER:       { icon: <MessageSquare size={16} />,  color: 'text-blue-400 bg-blue-400/10',    label: 'Lembrete' },
  WEEKLY_SUMMARY:       { icon: <BarChart2 size={16} />,      color: 'text-purple-400 bg-purple-400/10', label: 'Resumo semanal' },
  BUDGET_ALERT:         { icon: <AlertCircle size={16} />,    color: 'text-amber-400 bg-amber-400/10',   label: 'Orçamento' },
  FIXED_EXPENSE_TOMORROW:{ icon: <CalendarClock size={16} />, color: 'text-red-400 bg-red-400/10',       label: 'Despesa amanhã' },
  FIXED_EXPENSE_TODAY:  { icon: <TrendingDown size={16} />,   color: 'text-red-500 bg-red-500/10',       label: 'Despesa hoje' },
  FIXED_INCOME_TODAY:   { icon: <TrendingUp size={16} />,     color: 'text-green-400 bg-green-400/10',   label: 'Receita hoje' },
  CUSTOM_REMINDER:      { icon: <Bell size={16} />,           color: 'text-blue-400 bg-blue-400/10',     label: 'Lembrete' },
};

function formatRelative(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Agora';
  if (diffMin < 60) return `há ${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'Ontem';
  if (diffD < 7) return `há ${diffD} dias`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

interface Props {
  notifications: AppNotification[];
}

export function NotificationCenter({ notifications: initial }: Props) {
  const [items, setItems] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDismiss = (id: string) => {
    setItems(prev => prev.filter(n => n.id !== id));
    startTransition(() => dismissNotification(id));
  };

  const handleDismissAll = () => {
    setItems([]);
    startTransition(() => dismissAll());
  };

  const handleMarkAllRead = () => {
    setItems(prev => prev.map(n => ({ ...n, status: 'read' as const })));
    startTransition(() => markAllAsRead());
  };

  const handleClick = (item: AppNotification) => {
    if (item.status === 'unread') {
      setItems(prev => prev.map(n => n.id === item.id ? { ...n, status: 'read' as const } : n));
      startTransition(() => markAsRead(item.id));
    }
    if (item.url) router.push(item.url);
  };

  const unread = items.filter(n => n.status === 'unread').length;

  return (
    <div className="px-4 space-y-3 flex-1">
      {/* Ações em massa */}
      {items.length > 0 && (
        <div className="flex gap-2 justify-end">
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={handleMarkAllRead}
              disabled={isPending}
            >
              <CheckCheck size={14} /> Marcar todas como lidas
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-destructive"
            onClick={handleDismissAll}
            disabled={isPending}
          >
            <Trash2 size={14} /> Limpar tudo
          </Button>
        </div>
      )}

      {/* Estado vazio */}
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
            <Bell size={28} className="opacity-40" />
          </div>
          <p className="text-sm font-medium">Nenhuma notificação no momento.</p>
          <p className="text-xs opacity-60">As notificações aparecerão aqui.</p>
        </div>
      )}

      {/* Lista de notificações */}
      {items.map(item => {
        const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.DAILY_REMINDER;
        const isUnread = item.status === 'unread';

        return (
          <div
            key={item.id}
            className={`relative flex gap-3 p-4 rounded-2xl border cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] ${
              isUnread
                ? 'bg-secondary/80 border-white/10'
                : 'bg-secondary/30 border-white/5 opacity-75'
            }`}
            onClick={() => handleClick(item)}
          >
            {/* Dot de não lido */}
            {isUnread && (
              <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary" />
            )}

            {/* Ícone do tipo */}
            <div className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center ${cfg.color}`}>
              {cfg.icon}
            </div>

            {/* Conteúdo */}
            <div className="flex-1 min-w-0 pr-3">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider opacity-50">
                  {cfg.label}
                </span>
                <span className="text-[10px] opacity-40 ml-auto">{formatRelative(item.created_at)}</span>
              </div>
              <p className="text-sm font-semibold leading-tight">{item.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">{item.body}</p>
            </div>

            {/* Botão de remover */}
            <button
              className="absolute bottom-3 right-3 text-muted-foreground hover:text-destructive transition-colors p-1"
              onClick={e => { e.stopPropagation(); handleDismiss(item.id); }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
