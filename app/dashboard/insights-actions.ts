"use server"

import { createClient } from "@/utils/supabase/server"
import OpenAI from "openai"
import { unstable_cache } from "next/cache"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function getDailyInsights() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return null

  return await generateInsights(user.id)
}

async function generateInsights(userId: string) {
  const supabase = await createClient()
  
  // Pegar data de 30 dias atrás
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  // Buscar transações dos últimos 30 dias
  const { data: transactions } = await supabase
    .from('transactions')
    .select('amount, type, category, description, transaction_date')
    .eq('user_id', userId)
    .gte('transaction_date', thirtyDaysAgo.toISOString().split('T')[0])
    .order('transaction_date', { ascending: false })

  const { data: goalDeposits } = await supabase
    .from('goal_deposits')
    .select('amount, deposit_date, goals!inner(user_id)')
    .eq('goals.user_id', userId)
    .gte('deposit_date', thirtyDaysAgo.toISOString().split('T')[0])

  if (!transactions || transactions.length < 3) {
    return [
      { emoji: "👋", text: "Bem-vindo ao Insights do Fin! Cadastre mais algumas despesas para eu começar a analisar seus padrões." },
      { emoji: "📊", text: "Eu vou analisar para onde seu dinheiro está indo e te dar dicas para economizar." },
      { emoji: "💡", text: "Tente usar o chat por voz para cadastrar seus gastos de hoje!" }
    ]
  }

  // Agrupar e resumir dados para não estourar os tokens do GPT
  let totalIncome = 0
  let totalExpense = 0
  const categoryTotals: Record<string, number> = {}

  transactions.forEach(t => {
    const val = Number(t.amount)
    if (t.type === 'income') totalIncome += val
    else {
      totalExpense += val
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + val
    }
  })

  let totalGoals = 0
  if (goalDeposits) {
    goalDeposits.forEach(g => {
      totalGoals += Number(g.amount)
    })
  }

  // Ordenar categorias por gasto
  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([cat, val]) => {
      const pct = totalExpense > 0 ? ((val / totalExpense) * 100).toFixed(0) : 0
      return `${cat}: R$ ${val.toFixed(2)} (${pct}% do total)`
    })
    .join(' | ')

  const expenseRatio = totalIncome > 0 ? ((totalExpense / totalIncome) * 100).toFixed(0) : 0
  const goalsRatio = totalIncome > 0 ? ((totalGoals / totalIncome) * 100).toFixed(0) : 0

  const prompt = `Você é o "Fin", o analista de dados financeiros premium do app Finchat.
Você deve gerar exatamente 3 insights EXPLÍCITOS, MATEMÁTICOS E CRÚS baseados no resumo dos últimos 30 dias do usuário.

DADOS EXATOS DOS ÚLTIMOS 30 DIAS:
- Receitas Totais: R$ ${totalIncome.toFixed(2)}
- Despesas Totais (Gastos): R$ ${totalExpense.toFixed(2)}
- Total Investido em Objetivos/Metas: R$ ${totalGoals.toFixed(2)}
- Comprometimento de Renda: As despesas representam ${expenseRatio}% das receitas.
- Poupança/Investimentos: O usuário direcionou ${goalsRatio}% da sua renda para construir patrimônio (objetivos).
- Gastos por Categoria: ${topCategories}
- Transações Registradas: ${transactions.length}

REGRAS ABSOLUTAS:
1. PROIBIDO frases genéricas de coach financeiro (ex: "Que tal economizar?", "Tente cozinhar em casa").
2. OBRIGATÓRIO citar os números exatos e porcentagens fornecidas acima em TODOS os 3 insights.
3. Se houver valores em "Objetivos", elogie o fato do usuário estar investindo no próprio patrimônio. NUNCA trate os aportes de objetivos como "gastos negativos", e sim como construção de patrimônio ("Você direcionou X% para metas futuras").
4. O texto deve parecer um relatório de contador de alto nível, mas com tom amigável e encorajador sobre os objetivos.
5. Retorne APENAS um array JSON de 3 objetos, cada um com "emoji" (relacionado ao tema) e "text" (máx 25 palavras).

EXEMPLO DE TOM (Não copie os números):
[
  { "emoji": "🚀", "text": "Excelente! Você direcionou 18% (R$ 1.200) dos seus ganhos para suas metas futuras neste período." },
  { "emoji": "⚠️", "text": "Suas despesas de R$ 2.500 já consumiram 85% dos seus ganhos neste período. Restam apenas 15% de margem livre." },
  { "emoji": "🚗", "text": "Transporte sugou 40% (R$ 800) de todos os seus gastos comuns. Cuidado." }
]

Retorne EXATAMENTE o array JSON puro. NENHUM texto fora do JSON.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const content = response.choices[0].message.content?.trim();
    if (!content) throw new Error("No content");
    
    // Remove qualquer formatação markdown se houver acidentalmente
    const cleanContent = content.replace(/^```json\n?/, '').replace(/```$/, '').trim();
    
    const insights = JSON.parse(cleanContent);
    return insights as { emoji: string, text: string }[];
  } catch (error) {
    console.error("Erro ao gerar insights:", error)
    return [
      { emoji: "✨", text: "Os Insights do Fin estão preparando novas dicas incríveis para você!" },
      { emoji: "💸", text: "Continue registrando seus gastos para uma análise mais profunda." },
      { emoji: "🔔", text: "Lembre-se de verificar suas despesas fixas deste mês." }
    ]
  }
}
