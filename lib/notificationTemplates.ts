export type NotificationType =
  | 'DAILY_REMINDER'
  | 'WEEKLY_SUMMARY'
  | 'BUDGET_ALERT'
  | 'FIXED_EXPENSE_TOMORROW'
  | 'FIXED_EXPENSE_TODAY'
  | 'FIXED_INCOME_TODAY';

export interface NotificationTemplate {
  type: NotificationType;
  title: string;
  body: string;
  url: string;
  icon: string;
}

// ─── Templates ────────────────────────────────────────────────────────────────

export function tplDailyReminder(): NotificationTemplate {
  return {
    type: 'DAILY_REMINDER',
    title: 'Como foi seu dia financeiro? 💬',
    body: 'Registre seus gastos de hoje conversando com o Atlas.',
    url: '/chat',
    icon: '/icon-192x192.png',
  };
}

export function tplWeeklySummary(params: {
  totalExpense: number;
  topCategory: string;
  vsLastWeek: number; // diferença em R$ (negativo = gastou menos)
}): NotificationTemplate {
  const sign = params.vsLastWeek <= 0 ? '↓' : '↑';
  const diff = Math.abs(params.vsLastWeek).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return {
    type: 'WEEKLY_SUMMARY',
    title: 'Seu resumo semanal chegou 📊',
    body: `Você gastou ${params.totalExpense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} esta semana. Maior categoria: ${params.topCategory}. ${sign} ${diff} em relação à semana anterior.`,
    url: '/dashboard',
    icon: '/icon-192x192.png',
  };
}

export function tplBudgetAlert(category: string): NotificationTemplate {
  return {
    type: 'BUDGET_ALERT',
    title: 'Atenção ao orçamento ⚠️',
    body: `Você ultrapassou o limite da categoria ${category}.`,
    url: '/dashboard',
    icon: '/icon-192x192.png',
  };
}

export function tplFixedExpenseTomorrow(description: string, amount: number): NotificationTemplate {
  return {
    type: 'FIXED_EXPENSE_TOMORROW',
    title: 'Despesa chegando 🔴',
    body: `Amanhã vence ${description}, no valor de ${amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`,
    url: '/dashboard',
    icon: '/icon-192x192.png',
  };
}

export function tplFixedExpenseToday(description: string, amount: number): NotificationTemplate {
  return {
    type: 'FIXED_EXPENSE_TODAY',
    title: 'Despesa vence hoje 🔴',
    body: `Hoje vence ${description}, no valor de ${amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`,
    url: '/dashboard',
    icon: '/icon-192x192.png',
  };
}

export function tplFixedIncomeToday(description: string, amount: number): NotificationTemplate {
  return {
    type: 'FIXED_INCOME_TODAY',
    title: 'Receita prevista para hoje 🟢',
    body: `Hoje está prevista a receita ${description}, no valor de ${amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`,
    url: '/dashboard',
    icon: '/icon-192x192.png',
  };
}

// ─── Tipos de preferências ─────────────────────────────────────────────────────

export interface NotificationPreferences {
  enabled: boolean;
  daily_reminder: boolean;
  weekly_summary: boolean;
  budget_alert: boolean;
  fixed_expenses: boolean;
  fixed_income: boolean;
}

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  daily_reminder: true,
  weekly_summary: true,
  budget_alert: true,
  fixed_expenses: true,
  fixed_income: true,
};
