"use server"

import { createClient } from "@/utils/supabase/server"

export type DashboardFilters = {
  month?: number;
  year?: number;
  date?: string;
  period?: 'day' | 'week' | 'month' | 'year';
  type?: 'all' | 'income' | 'expense';
}

function getPeriodDates(baseDateStr: string, period: 'day' | 'week' | 'month' | 'year') {
  const [y, m, d] = baseDateStr.split('-').map(Number);
  const baseDate = new Date(y, m - 1, d);

  let startDate: Date, endDate: Date;
  let prevStartDate: Date, prevEndDate: Date;

  if (period === 'day') {
    startDate = new Date(y, m - 1, d);
    endDate = new Date(y, m - 1, d);
    prevStartDate = new Date(y, m - 1, d - 1);
    prevEndDate = new Date(y, m - 1, d - 1);
  } else if (period === 'week') {
    // Semana começando na Segunda-feira
    const day = baseDate.getDay();
    const diff = baseDate.getDate() - day + (day === 0 ? -6 : 1);
    startDate = new Date(y, m - 1, diff);
    endDate = new Date(y, m - 1, diff + 6);
    
    prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - 7);
    prevEndDate = new Date(endDate);
    prevEndDate.setDate(prevEndDate.getDate() - 7);
  } else if (period === 'year') {
    startDate = new Date(y, 0, 1);
    endDate = new Date(y, 11, 31);
    
    prevStartDate = new Date(y - 1, 0, 1);
    prevEndDate = new Date(y - 1, 11, 31);
  } else {
    // Default: month
    startDate = new Date(y, m - 1, 1);
    endDate = new Date(y, m, 0); // último dia
    
    prevStartDate = new Date(y, m - 2, 1);
    prevEndDate = new Date(y, m - 1, 0);
  }

  const format = (d: Date) => {
    const py = d.getFullYear();
    const pm = String(d.getMonth() + 1).padStart(2, '0');
    const pd = String(d.getDate()).padStart(2, '0');
    return `${py}-${pm}-${pd}`;
  };

  return {
    start: format(startDate),
    end: format(endDate),
    prevStart: format(prevStartDate),
    prevEnd: format(prevEndDate),
  };
}

export async function getDashboardData(filters?: DashboardFilters) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Unauthorized")
  }

  const now = new Date()
  let baseDateStr = filters?.date;
  if (!baseDateStr) {
    const targetYear = filters?.year || now.getFullYear();
    const targetMonth = filters?.month !== undefined ? filters.month : now.getMonth();
    // Use dia 1 se não for especificado, exceto se for o mês/ano atual (para semana funcionar bem)
    const d = (targetYear === now.getFullYear() && targetMonth === now.getMonth()) ? String(now.getDate()).padStart(2, '0') : '01';
    baseDateStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${d}`;
  }
  const period = filters?.period || 'month';

  const { start: startDate, end: endDate, prevStart: prevStartDate, prevEnd: prevEndDate } = getPeriodDates(baseDateStr, period);

  let queryCurrent = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100)

  let queryPrev = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .gte('transaction_date', prevStartDate)
    .lte('transaction_date', prevEndDate)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100)

  if (filters?.type && filters.type !== 'all') {
    queryCurrent = queryCurrent.eq('type', filters.type)
    queryPrev = queryPrev.eq('type', filters.type)
  }

  let queryGoalsCurrent = supabase
    .from('goal_deposits')
    .select('*, goals!inner(name, icon, user_id)')
    .eq('goals.user_id', user.id)
    .gte('deposit_date', startDate)
    .lte('deposit_date', endDate)

  let queryGoalsPrev = supabase
    .from('goal_deposits')
    .select('*, goals!inner(user_id)')
    .eq('goals.user_id', user.id)
    .gte('deposit_date', prevStartDate)
    .lte('deposit_date', prevEndDate)

  const [resCurrent, resPrev, resGoalsCurrent, resGoalsPrev] = await Promise.all([queryCurrent, queryPrev, queryGoalsCurrent, queryGoalsPrev])

  if (resCurrent.error) console.error(resCurrent.error)
  if (resPrev.error) console.error(resPrev.error)
  if (resGoalsCurrent.error) console.error(resGoalsCurrent.error)
  if (resGoalsPrev.error) console.error(resGoalsPrev.error)

  const transactions = resCurrent.data || []
  const prevTransactions = resPrev.data || []

  let income = 0
  let expense = 0
  const categoryTotals: Record<string, number> = {}

  transactions.forEach((t) => {
    if (t.type === 'income') {
      income += Number(t.amount)
    } else {
      expense += Number(t.amount)
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Number(t.amount)
    }
  })

  let prevIncome = 0
  let prevExpense = 0
  prevTransactions.forEach((t) => {
    if (t.type === 'income') prevIncome += Number(t.amount)
    else prevExpense += Number(t.amount)
  })

  let goalsTotal = 0
  const goalsCurrent = resGoalsCurrent.data || []
  goalsCurrent.forEach(g => { goalsTotal += Number(g.amount) })

  let prevGoalsTotal = 0
  const goalsPrev = resGoalsPrev.data || []
  goalsPrev.forEach(g => { prevGoalsTotal += Number(g.amount) })

  const balance = income - expense - goalsTotal
  const prevBalance = prevIncome - prevExpense - prevGoalsTotal

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : (current < 0 ? -100 : 0);
    return Math.round(((current - previous) / Math.abs(previous)) * 100);
  }

  const incomeChange = calculateChange(income, prevIncome)
  const expenseChange = calculateChange(expense, prevExpense)
  const balanceChange = calculateChange(balance, prevBalance)
  const goalsChange = calculateChange(goalsTotal, prevGoalsTotal)
  
  let savingsRate = 0
  if (income > 0) {
    savingsRate = Math.max(0, Math.round(((income - expense) / income) * 100))
  }

  const chartData = Object.keys(categoryTotals).map(category => ({
    name: category,
    value: categoryTotals[category]
  })).sort((a, b) => b.value - a.value)

  // Format goal deposits to look like transactions for the list
  const formattedGoals = goalsCurrent.map(g => ({
    id: `goal_${g.id}`,
    amount: g.amount,
    category: 'Objetivos',
    description: `Aporte: ${g.goals?.name || 'Meta'}`,
    transaction_date: g.deposit_date,
    type: 'goal_deposit',
    created_at: g.created_at || g.deposit_date
  }))

  const allTransactions = [...transactions, ...formattedGoals].sort((a, b) => {
    const dateA = new Date(a.transaction_date).getTime()
    const dateB = new Date(b.transaction_date).getTime()
    if (dateA !== dateB) return dateB - dateA
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return {
    balance,
    income,
    expense,
    goalsTotal,
    transactions: allTransactions,
    chartData,
    totalTransactions: allTransactions.length,
    savingsRate,
    periodLabel: period, // to help frontend
    changes: {
      income: incomeChange,
      expense: expenseChange,
      balance: balanceChange,
      goals: goalsChange
    }
  }
}

export async function getAvailablePeriods() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { availableYears: [new Date().getFullYear().toString()], availableMonths: [new Date().getMonth().toString()] }
  }

  // Fetch all transaction dates for the user to determine available periods
  const { data, error } = await supabase
    .from('transactions')
    .select('transaction_date')
    .eq('user_id', user.id)

  if (error || !data || data.length === 0) {
    return { availableYears: [new Date().getFullYear().toString()], availableMonths: [new Date().getMonth().toString()] }
  }

  const years = new Set<string>()
  const months = new Set<string>() // format "YYYY-MM" or just "MM"

  data.forEach((t) => {
    if (t.transaction_date) {
      const [year, month] = t.transaction_date.split('-')
      years.add(year)
      // Store month as an integer string 0-11 to match our frontend logic
      months.add((parseInt(month) - 1).toString())
    }
  })

  // Ensure current month/year is always available so it's not totally empty
  years.add(new Date().getFullYear().toString())
  months.add(new Date().getMonth().toString())

  return {
    availableYears: Array.from(years).sort((a, b) => parseInt(b) - parseInt(a)),
    availableMonths: Array.from(months).sort((a, b) => parseInt(a) - parseInt(b))
  }
}

export async function updateTransactionCategory(txId: string, category: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Unauthorized")
  }

  const { error } = await supabase
    .from('transactions')
    .update({ category })
    .eq('id', txId)
    .eq('user_id', user.id)

  if (error) {
    console.error(error)
    return false
  }

  return true
}
