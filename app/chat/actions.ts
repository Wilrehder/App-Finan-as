"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { parseMessage, ParsedIntent } from "@/lib/parser"
import { syncRecurringTransactions } from "@/lib/sync"

export async function parseUserIntent(message: string, context?: ParsedIntent) {
  let parsed = await parseMessage(message, context)
  
  // MACRO FIX: Garantir que o contexto não seja perdido pelo GPT se a intenção for a mesma
  if (parsed && context && (context.intent === parsed.intent || (context.intent === 'incomplete_fixed' && parsed.intent === 'register_fixed'))) {
    const merged = { ...context };
    for (const key in parsed) {
      if (parsed[key as keyof ParsedIntent] !== undefined && parsed[key as keyof ParsedIntent] !== null) {
        (merged as any)[key] = parsed[key as keyof ParsedIntent];
      }
    }
    parsed = merged as ParsedIntent;
  }
  // Não entendeu nada — mostra menu de capacidades com botões na UI
  if (!parsed || parsed.intent === 'unknown') {
    return {
      success: false,
      isShowCapabilities: true,
      message: parsed?.reply_message || `Não entendi 😅 Veja o que posso fazer por você:`
    }
  }

  if (parsed.intent === 'manage_fixed') {
    return {
      success: true,
      message: "Aqui está um atalho para você visualizar e editar todas as suas contas e rendas fixas:",
      isReport: true,
      payload: { action: 'open_settings' }
    }
  }

  if (parsed.intent === 'report') {
    return await generateReport(parsed);
  }

  if (parsed.intent === 'delete') {
    return {
      success: true,
      message: "Você deseja apagar a ÚLTIMA transação que você registrou? Isso não pode ser desfeito.",
      isDeleteRequest: true,
      payload: { action: 'confirm_delete' }
    }
  }

  if (parsed.intent === 'create_goal') {
    const isMissingMonthlyDay = parsed.goal_frequency === 'monthly' && !parsed.goal_payment_day;
    if (!parsed.goal_name || !parsed.goal_target_amount || !parsed.goal_deadline || !parsed.goal_frequency || isMissingMonthlyDay) {
      return {
        success: true,
        message: parsed.reply_message || "Preciso de mais algumas informações para criar seu objetivo.",
        payload: parsed
      }
    }
    return {
      success: true,
      message: parsed.reply_message || "Tudo certo para criar seu objetivo! Dá uma olhada na prévia abaixo:",
      isGoalPreview: true,
      payload: parsed
    }
  }

  if (parsed.intent === 'goal_deposit') {
    if (!parsed.amount || !parsed.goal_name) {
      return {
        success: true,
        message: parsed.reply_message || "Qual o valor do aporte e para qual objetivo?",
        payload: parsed
      }
    }
    return {
      success: true,
      message: parsed.reply_message || "Posso confirmar esse aporte para a sua meta?",
      isGoalDeposit: true,
      payload: parsed
    }
  }

  if (parsed.intent === 'goal_status') {
    return await generateGoalStatus(parsed);
  }

  // Se for register_fixed ou register normal:
  return {
    success: true,
    message: parsed.reply_message || "Tudo certo! Posso confirmar?",
    payload: parsed
  }
}


async function generateReport(parsed: ParsedIntent) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error("Unauthorized")

  await syncRecurringTransactions()

  let query = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .gte('transaction_date', parsed.report_start_date)
    .lte('transaction_date', parsed.report_end_date)

  if (parsed.report_category) {
    query = query.ilike('category', `%${parsed.report_category}%`)
  }

  if (parsed.report_type) {
    query = query.eq('type', parsed.report_type)
  }

  const { data: transactions, error } = await query

  if (error) {
    return { success: false, message: "Erro ao buscar relatório no banco." }
  }

  let income = 0;
  let expense = 0;
  transactions.forEach(t => {
    if (t.type === 'income') income += Number(t.amount);
    else expense += Number(t.amount);
  });

  const balance = income - expense;

  let title = `📊 **Relatório para ${parsed.report_period_name}**`
  if (parsed.report_category) {
    title = `📊 **Relatório de ${parsed.report_category} (${parsed.report_period_name})**`
  } else if (parsed.report_type === 'expense') {
    title = `📊 **Relatório de Despesas (${parsed.report_period_name})**`
  } else if (parsed.report_type === 'income') {
    title = `📊 **Relatório de Receitas (${parsed.report_period_name})**`
  }

  let reportText = `${title}\n\n`

  if (transactions.length === 0) {
    reportText += `Você não tem nenhuma movimentação registrada com esses critérios.`
  } else {
    if (!parsed.report_type || parsed.report_type === 'income') {
      reportText += `🔸 Receitas: R$ ${income.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`
    }
    if (!parsed.report_type || parsed.report_type === 'expense') {
      reportText += `🔻 Despesas: R$ ${expense.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`
    }
    if (!parsed.report_type && !parsed.report_category) {
      reportText += `💸 Saldo do Período: R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    } else if (!parsed.report_type && parsed.report_category) {
      reportText += `💸 Saldo (${parsed.report_category}): R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
  }

  return {
    success: true,
    message: reportText,
    isReport: true // Usado no frontend para saber que não precisa confirmar nada
  }
}

export async function confirmTransaction(parsed: ParsedIntent) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error("Unauthorized")

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const finalDate = parsed.transaction_date || todayStr;

  const { error: dbError } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      type: parsed.type,
      amount: parsed.amount,
      category: parsed.category,
      description: parsed.description,
      transaction_date: finalDate, // Nova coluna
    })

  if (dbError) {
    return {
      success: false,
      message: "Erro ao salvar no banco de dados. " + dbError.message
    }
  }

  revalidatePath("/dashboard")
  revalidatePath("/chat")

  const typeStr = parsed.type === 'income' ? 'Receita' : 'Despesa'
  const [y, m, d] = finalDate.split('-')
  
  return {
    success: true,
    message: `✅ ${typeStr} de R$ ${parsed.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} salva com sucesso para o dia ${d}/${m}/${y}!`
  }
}

export async function confirmFixedTransaction(parsed: ParsedIntent) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error("Unauthorized")

  const { error: dbError } = await supabase
    .from('recurring_transactions')
    .insert({
      user_id: user.id,
      type: parsed.type || 'expense',
      amount: parsed.amount,
      category: parsed.category || 'Outros',
      description: parsed.description,
      day_of_month: parsed.day_of_month,
      is_business_day: parsed.is_business_day || false,
    })

  if (dbError) {
    return {
      success: false,
      message: "Erro ao salvar conta fixa no banco de dados. " + dbError.message
    }
  }

  // Force sync immediately
  await syncRecurringTransactions()

  revalidatePath("/dashboard")
  revalidatePath("/chat")
  revalidatePath("/configuracoes")

  const typeStr = parsed.type === 'income' ? 'Receita Fixa' : 'Despesa Fixa'
  const dayStr = parsed.is_business_day ? `${parsed.day_of_month}º dia útil` : `dia ${parsed.day_of_month}`
  
  return {
    success: true,
    message: `🔄 ${typeStr} de R$ ${parsed.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} salva com sucesso para todo ${dayStr}! O lançamento deste mês já foi gerado.`
  }
}

export async function deleteLastTransaction() {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error("Unauthorized")

  // Find the most recently created transaction
  const { data: lastTx, error: fetchError } = await supabase
    .from('transactions')
    .select('id, description, amount, type, recurring_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (fetchError || !lastTx) {
    return { success: false, message: "Não encontrei nenhuma transação recente para apagar." }
  }

  let deleteError;
  if (lastTx.recurring_id) {
    // Se for recorrente, apenas marcamos como deletada no título para evitar que o sync a recrie
    const res = await supabase
      .from('transactions')
      .update({ description: `[DELETED] ${lastTx.description}` })
      .eq('id', lastTx.id)
    deleteError = res.error
  } else {
    // Se não for recorrente, deleta fisicamente
    const res = await supabase
      .from('transactions')
      .delete()
      .eq('id', lastTx.id)
    deleteError = res.error
  }

  if (deleteError) {
    return { success: false, message: "Erro ao tentar apagar a transação." }
  }

  revalidatePath("/dashboard")
  revalidatePath("/chat")

  const typeStr = lastTx.type === 'income' ? 'Receita' : 'Despesa'
  return { 
    success: true, 
    message: `🗑️ Pronto! A última transação (${typeStr} de R$ ${Number(lastTx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) foi apagada com sucesso.` 
  }
}



export async function deleteReminder(id: string) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from('reminders')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { success: false, message: "Erro ao excluir lembrete." }
  }

  revalidatePath("/calendario")
  revalidatePath("/notificacoes")

  return { success: true }
}

async function generateGoalStatus(parsed: ParsedIntent) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error("Unauthorized")

  if (!parsed.goal_name) {
    return { success: false, message: "Não consegui identificar qual objetivo você quer consultar." }
  }

  const { data: goals, error } = await supabase
    .from('goals')
    .select('*, goal_deposits(amount)')
    .eq('user_id', user.id)
    .ilike('name', `%${parsed.goal_name}%`)
    .limit(1)

  if (error || !goals || goals.length === 0) {
    return { success: false, message: `Não encontrei nenhum objetivo com o nome parecido com "${parsed.goal_name}".` }
  }

  const goal = goals[0]
  const totalSaved = goal.goal_deposits.reduce((acc: number, dep: any) => acc + Number(dep.amount), 0)
  const remaining = Number(goal.target_amount) - totalSaved
  const percentage = (totalSaved / Number(goal.target_amount)) * 100

  let msg = `O seu objetivo **${goal.icon || '🎯'} ${goal.name}** está com ${percentage.toFixed(1)}% concluído!\n\n`
  msg += `Você já guardou R$ ${totalSaved.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} de R$ ${Number(goal.target_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.\n`
  
  if (remaining > 0) {
    msg += `Faltam R$ ${remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} para você atingir a meta até ${new Date(goal.deadline).toLocaleDateString('pt-BR')}.`
  } else {
    msg += `🎉 Parabéns! Você já atingiu (ou ultrapassou) o valor desse objetivo!`
  }

  return {
    success: true,
    message: msg,
    isReport: true
  }
}

export async function confirmGoal(parsed: ParsedIntent) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error("Unauthorized")

  const { error: dbError } = await supabase
    .from('goals')
    .insert({
      user_id: user.id,
      name: parsed.goal_name,
      target_amount: parsed.goal_target_amount,
      deadline: parsed.goal_deadline,
      frequency: parsed.goal_frequency,
      payment_day: parsed.goal_payment_day,
      icon: parsed.goal_icon || '🎯'
    })

  if (dbError) {
    return { success: false, message: "Erro ao salvar objetivo no banco de dados. " + dbError.message }
  }

  revalidatePath("/dashboard")
  revalidatePath("/chat")
  revalidatePath("/objetivos")

  return {
    success: true,
    message: `🎯 Objetivo "${parsed.goal_name}" criado com sucesso! Vamos começar a guardar?`
  }
}

export async function confirmGoalDeposit(parsed: ParsedIntent) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error("Unauthorized")

  // Find the goal
  const { data: goals, error: fetchError } = await supabase
    .from('goals')
    .select('id, name')
    .eq('user_id', user.id)
    .ilike('name', `%${parsed.goal_name}%`)
    .limit(1)

  if (fetchError || !goals || goals.length === 0) {
    return { success: false, message: `Não encontrei nenhum objetivo parecido com "${parsed.goal_name}".` }
  }

  const goal = goals[0]

  // Convert amount, ensuring it's a valid positive number
  const amountToSave = Math.abs(Number(parsed.amount || 0));
  if (amountToSave <= 0) {
    return { success: false, message: "Por favor, informe um valor maior que zero." };
  }

  // Pegar data atual no fuso do Brasil para registrar
  const now = new Date();
  const brOffset = -3 * 60; // UTC-3
  const brTime = new Date(now.getTime() + (brOffset - now.getTimezoneOffset()) * 60000);
  const todayStr = brTime.toISOString().split('T')[0];

  const { error: dbError } = await supabase
    .from('goal_deposits')
    .insert({
      goal_id: goal.id,
      amount: amountToSave,
      deposit_date: todayStr
    })

  if (dbError) {
    return { success: false, message: "Erro ao salvar aporte no banco de dados. " + dbError.message }
  }

  revalidatePath("/dashboard")
  revalidatePath("/chat")
  revalidatePath("/objetivos")

  return {
    success: true,
    message: `💰 Aporte de R$ ${amountToSave.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} adicionado ao objetivo "${goal.name}" com sucesso! 🎉`
  }
}
