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

  // Ordenar categorias por gasto
  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat, val]) => `${cat}: R$ ${val.toFixed(2)}`)
    .join(', ')

  const prompt = `Você é o "Fin", o assistente financeiro premium do app Finchat.
Você deve gerar exatamente 3 insights financeiros altamente inteligentes, curtos e acionáveis baseados no resumo dos últimos 30 dias do usuário.

RESUMO DOS ÚLTIMOS 30 DIAS:
- Receitas Totais: R$ ${totalIncome.toFixed(2)}
- Despesas Totais: R$ ${totalExpense.toFixed(2)}
- Maiores gastos por categoria: ${topCategories}
- Total de transações registradas: ${transactions.length}

Regras:
1. Retorne APENAS um array JSON de 3 objetos, cada um com "emoji" e "text".
2. O texto deve ser super direto, amigável, e usar a primeira pessoa como um consultor (ex: "Notei que você..."). Máximo de 15 palavras por insight.
3. Foque em elogios se o saldo for positivo, ou alertas gentis se ele estiver gastando muito em uma categoria específica.
4. Exemplo de retorno:
[
  { "emoji": "🍔", "text": "Você gastou R$ 400 em Alimentação. Que tal cozinhar mais em casa essa semana?" },
  { "emoji": "💰", "text": "Suas receitas estão maiores que as despesas! Ótimo trabalho em manter o controle." },
  { "emoji": "📈", "text": "Sua maior despesa foi Transporte. Avalie se o uso de Uber está dentro do ideal." }
]

Retorne EXATAMENTE o array JSON, sem marcações markdown como \`\`\`json.`;

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
