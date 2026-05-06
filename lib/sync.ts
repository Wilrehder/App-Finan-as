import { createClient } from "@/utils/supabase/server"

// Retorna o N-ésimo dia útil de um dado mês e ano
function getNthBusinessDay(year: number, month: number, nth: number): number {
  let businessDaysCount = 0;
  let currentDay = 1;
  const maxDays = new Date(year, month + 1, 0).getDate();

  while (currentDay <= maxDays) {
    const date = new Date(year, month, currentDay);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDaysCount++;
    }

    if (businessDaysCount === nth) {
      return currentDay;
    }

    currentDay++;
  }

  // Se pedir um dia útil maior do que o possível no mês, retorna o último dia útil do mês
  let lastDay = maxDays;
  while (true) {
    const d = new Date(year, month, lastDay).getDay();
    if (d !== 0 && d !== 6) return lastDay;
    lastDay--;
  }
}

export async function syncRecurringTransactions() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // Busca todas as transações recorrentes do usuário
  const { data: recurring, error: recError } = await supabase
    .from('recurring_transactions')
    .select('*')
    .eq('user_id', user.id)

  if (recError || !recurring || recurring.length === 0) return

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0-11
  
  // Primeiro e último dia do mês atual
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // Busca transações já lançadas neste mês que vieram de uma recorrente
  const { data: currentMonthTx, error: txError } = await supabase
    .from('transactions')
    .select('recurring_id')
    .eq('user_id', user.id)
    .not('recurring_id', 'is', null)
    .gte('transaction_date', firstDay.toISOString().split('T')[0])
    .lte('transaction_date', lastDay.toISOString().split('T')[0])

  if (txError) return

  const processedRecurringIds = new Set(currentMonthTx.map(tx => tx.recurring_id))

  // Transações que precisam ser inseridas neste mês
  const transactionsToInsert = []

  for (const rec of recurring) {
    if (!processedRecurringIds.has(rec.id)) {
      let targetDay: number;

      if (rec.is_business_day) {
        targetDay = getNthBusinessDay(year, month, rec.day_of_month);
      } else {
        // Ajusta o dia caso o mês tenha menos dias que o dia configurado (ex: dia 31 em fevereiro)
        const maxDaysInMonth = lastDay.getDate()
        targetDay = Math.min(rec.day_of_month, maxDaysInMonth)
      }
      
      // Monta a data no formato YYYY-MM-DD
      const txDate = new Date(year, month, targetDay)
      // Ajuste para evitar problemas de fuso horário, forçando o formato da string
      const yyyy = txDate.getFullYear()
      const mm = String(txDate.getMonth() + 1).padStart(2, '0')
      const dd = String(txDate.getDate()).padStart(2, '0')

      transactionsToInsert.push({
        user_id: user.id,
        type: rec.type,
        amount: rec.amount,
        category: rec.category,
        description: `${rec.description}`,
        transaction_date: `${yyyy}-${mm}-${dd}`,
        recurring_id: rec.id
      })
    }
  }

  // Insere em lote as transações faltantes
  if (transactionsToInsert.length > 0) {
    await supabase.from('transactions').insert(transactionsToInsert)
  }
}
