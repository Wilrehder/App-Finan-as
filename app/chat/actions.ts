"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { parseMessage, ParsedIntent } from "@/lib/parser"
import { syncRecurringTransactions } from "@/lib/sync"

export async function parseUserIntent(message: string, context?: ParsedIntent) {
  const parsed = await parseMessage(message, context)
  
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

  // Se for register_fixed, reminder, ou register normal:
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

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .gte('transaction_date', parsed.report_start_date)
    .lte('transaction_date', parsed.report_end_date)

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

  let reportText = `📊 **Relatório para ${parsed.report_period_name}**:\n\n`
  reportText += `🔸 Receitas: R$ ${income.toFixed(2)}\n`
  reportText += `🔻 Despesas: R$ ${expense.toFixed(2)}\n`
  reportText += `💸 Saldo do Período: R$ ${balance.toFixed(2)}`

  if (transactions.length === 0) {
    reportText = `Você não tem nenhuma movimentação registrada para ${parsed.report_period_name}.`
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

  const { error: dbError } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      type: parsed.type,
      amount: parsed.amount,
      category: parsed.category,
      description: parsed.description,
      transaction_date: parsed.transaction_date, // Nova coluna
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
  const [y, m, d] = parsed.transaction_date!.split('-')
  
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
    .select('id, description, amount, type')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (fetchError || !lastTx) {
    return { success: false, message: "Não encontrei nenhuma transação recente para apagar." }
  }

  // Delete it
  const { error: deleteError } = await supabase
    .from('transactions')
    .delete()
    .eq('id', lastTx.id)

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

export async function confirmReminder(parsed: ParsedIntent) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error("Unauthorized")

  const { error: dbError } = await supabase
    .from('reminders')
    .insert({
      user_id: user.id,
      title: parsed.description,
      remind_at: parsed.remind_at,
      frequency: parsed.frequency,
      day_of_month: parsed.day_of_month,
      day_of_week: parsed.day_of_week,
      specific_date: parsed.specific_date,
    })

  if (dbError) {
    return {
      success: false,
      message: "Erro ao salvar lembrete no banco de dados. " + dbError.message
    }
  }

  // Integração com QStash para envio EXATO no minuto
  if (process.env.QSTASH_TOKEN) {
    try {
      const { Client } = require("@upstash/qstash");
      const qstash = new Client({ 
        token: process.env.QSTASH_TOKEN,
        baseUrl: process.env.QSTASH_URL // Garante que usa a URL EU se for o caso
      });
      
      // Tenta pegar a URL de várias formas seguras
      let appUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (!appUrl && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
        appUrl = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
      }
      if (!appUrl) {
        appUrl = "https://app-finan-as.vercel.app"; // Fallback absoluto para o projeto atual
      }
      
      const dest = `${appUrl}/api/push/qstash`;

      const { data: inserted } = await supabase
        .from('reminders')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (inserted) {
        if (parsed.frequency === 'once' && parsed.specific_date) {
          const [y, m, d] = parsed.specific_date.split('-');
          const [hr, min, sec] = parsed.remind_at!.split(':');
          const dateString = `${y}-${m}-${d}T${hr}:${min}:${sec}-03:00`;
          const timestamp = Math.floor(new Date(dateString).getTime() / 1000);

          await qstash.publishJSON({
            url: dest,
            body: { reminderId: inserted.id, userId: user.id },
            notBefore: timestamp
          });
        } else {
          const hr = parseInt(parsed.remind_at!.split(':')[0]);
          const min = parseInt(parsed.remind_at!.split(':')[1]);
          const utcHr = (hr + 3) % 24;

          let cronStr = `${min} ${utcHr} * * *`;
          if (parsed.frequency === 'monthly') cronStr = `${min} ${utcHr} ${parsed.day_of_month} * *`;
          if (parsed.frequency === 'weekly') cronStr = `${min} ${utcHr} * * ${parsed.day_of_week}`;

          await qstash.schedules.create({
            destination: dest,
            cron: cronStr,
            body: { reminderId: inserted.id, userId: user.id }
          });
        }
      }
    } catch (e) {
      console.error("Erro ao agendar no QStash", e);
    }
  }

  revalidatePath("/calendario")
  revalidatePath("/chat")
  revalidatePath("/notificacoes")

  return {
    success: true,
    message: `🔔 Lembrete "${parsed.description}" agendado com sucesso!`
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
