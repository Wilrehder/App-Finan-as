'use client';

import { useState } from 'react';
import { ArrowUpIcon, ArrowDownIcon, Settings, ChevronDown } from 'lucide-react';
import { DeleteTransactionButton } from '@/components/delete-transaction-button';
import Link from 'next/link';

const PAGE_SIZE = 15;

type Transaction = {
  id: string;
  description: string;
  amount: number | string;
  type: 'income' | 'expense' | 'goal_deposit';
  category: string;
  transaction_date: string;
  recurring_id: string | null;
};

function formatDate(dateStr: string) {
  const [, month, day] = dateStr.split('-');
  return `${day}/${month}`;
}

function TransactionItem({ t }: { t: Transaction }) {
  return (
    <div
      className={`flex items-center justify-between p-4 glass rounded-2xl border border-white/5 relative overflow-hidden`}
    >
      {t.recurring_id && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/40" />
      )}
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            t.type === 'income' ? 'bg-green-500/20 text-green-500' : 
            t.type === 'goal_deposit' ? 'bg-indigo-500/20 text-indigo-400' : 
            'bg-red-500/20 text-red-500'
          }`}
        >
          {t.type === 'income' ? <ArrowUpIcon size={18} /> : 
           t.type === 'goal_deposit' ? <span className="text-lg">🎯</span> : 
           <ArrowDownIcon size={18} />}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm leading-tight truncate max-w-[160px]">{t.description}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t.category} • {formatDate(t.transaction_date)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`font-semibold text-sm ${t.type === 'income' ? 'text-green-500' : t.type === 'goal_deposit' ? 'text-indigo-400' : ''}`}>
          {t.type === 'income' ? '+' : t.type === 'goal_deposit' ? '' : '-'}R${' '}
          {Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
        {t.type !== 'goal_deposit' && (
          <DeleteTransactionButton id={t.id} description={t.description} isRecurring={!!t.recurring_id} />
        )}
      </div>
    </div>
  );
}

interface Props {
  transactions: Transaction[];
}

export function TransactionList({ transactions }: Props) {
  const fixed = transactions.filter(t => t.recurring_id);
  const variable = transactions.filter(t => !t.recurring_id);

  const [visibleVariable, setVisibleVariable] = useState(PAGE_SIZE);
  const [visibleFixed, setVisibleFixed] = useState(PAGE_SIZE);

  if (transactions.length === 0) {
    return (
      <div className="text-center p-10 text-sm text-muted-foreground glass rounded-2xl">
        Nenhuma transação neste período.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Fixas ──────────────────────────────────────────────── */}
      {fixed.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Fixas ({fixed.length})
            </h3>
            <Link
              href="/configuracoes"
              className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
            >
              Gerenciar <Settings size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {fixed.slice(0, visibleFixed).map(t => (
              <TransactionItem key={t.id} t={t} />
            ))}
          </div>
          {fixed.length > visibleFixed && (
            <button
              onClick={() => setVisibleFixed(v => v + PAGE_SIZE)}
              className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground bg-secondary/40 hover:bg-secondary/70 transition-colors"
            >
              <ChevronDown size={14} />
              Ver mais {Math.min(PAGE_SIZE, fixed.length - visibleFixed)} fixas
            </button>
          )}
        </div>
      )}

      {/* ── Variáveis ───────────────────────────────────────────── */}
      {variable.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Variáveis ({variable.length})
          </h3>
          <div className="space-y-3">
            {variable.slice(0, visibleVariable).map(t => (
              <TransactionItem key={t.id} t={t} />
            ))}
          </div>
          {variable.length > visibleVariable && (
            <button
              onClick={() => setVisibleVariable(v => v + PAGE_SIZE)}
              className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground bg-secondary/40 hover:bg-secondary/70 transition-colors"
            >
              <ChevronDown size={14} />
              Ver mais {Math.min(PAGE_SIZE, variable.length - visibleVariable)} transações
            </button>
          )}
        </div>
      )}
    </div>
  );
}
