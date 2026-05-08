"use server"

import { createClient } from "@/utils/supabase/server"

export type DashboardFilters = {
  month?: number;
  year?: number;
  type?: 'all' | 'income' | 'expense';
}

export async function getDashboardData(filters?: DashboardFilters) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Unauthorized")
  }

  const now = new Date()
  const targetYear = filters?.year || now.getFullYear()
  const targetMonth = filters?.month !== undefined ? filters.month : now.getMonth()

  // Calculate start and end dates for the month
  const startDate = new Date(targetYear, targetMonth, 1).toISOString().split('T')[0]
  const endDate = new Date(targetYear, targetMonth + 1, 0).toISOString().split('T')[0]

  let query = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100) // nunca traz mais de 100 por mês — proteção de performance

  if (filters?.type && filters.type !== 'all') {
    query = query.eq('type', filters.type)
  }

  const { data: transactions, error } = await query

  if (error) {
    console.error(error)
    return {
      balance: 0,
      income: 0,
      expense: 0,
      transactions: [],
      chartData: [],
      totalTransactions: 0,
      savingsRate: 0
    }
  }

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

  const balance = income - expense
  
  let savingsRate = 0
  if (income > 0) {
    savingsRate = Math.max(0, Math.round(((income - expense) / income) * 100))
  }

  const chartData = Object.keys(categoryTotals).map(category => ({
    name: category,
    value: categoryTotals[category]
  })).sort((a, b) => b.value - a.value)

  return {
    balance,
    income,
    expense,
    transactions, // Return all transactions for the filtered period
    chartData,
    totalTransactions: transactions.length,
    savingsRate
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
