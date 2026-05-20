import { createClient } from "@/utils/supabase/server";
import { openai } from "@ai-sdk/openai";
import { streamText, tool } from "ai";
import { z } from "zod";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Determine current date/time in Brazil for context
  const now = new Date();
  const brOffset = -3 * 60; // UTC-3
  const brTime = new Date(now.getTime() + (brOffset - now.getTimezoneOffset()) * 60000);
  const todayStr = brTime.toISOString().split('T')[0];
  const currentMonth = brTime.getMonth() + 1;
  const currentYear = brTime.getFullYear();

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: `Você é um assistente financeiro inteligente chamado Finchat.
Você tem autonomia para ajudar o usuário com as finanças usando as ferramentas disponíveis.
Hoje é ${todayStr} (Ano ${currentYear}, Mês ${currentMonth}).

**REGRAS IMPORTANTES:**
1. Sempre responda de forma amigável e natural, como um assistente no WhatsApp brasileiro.
2. Se o usuário passar informações de transação (gasto, ganho, fixo), USE IMEDIATAMENTE a ferramenta correspondente para cadastrar no sistema.
3. SEMPRE formate valores monetários no padrão brasileiro (ex: R$ 1.500,00).
4. Após usar uma ferramenta, diga ao usuário que a ação foi concluída com sucesso (ex: "Prontinho! Sua despesa de R$ 50 no mercado já foi anotada.").`,
    messages,
    tools: {
      cadastrarTransacao: tool({
        description: 'Cadastra uma transação avulsa (receita ou despesa) na conta do usuário.',
        parameters: z.object({
          type: z.enum(['income', 'expense']).describe('O tipo da transação: income (receita) ou expense (despesa)'),
          amount: z.number().describe('O valor monetário da transação'),
          category: z.string().describe('A categoria. Ex: Alimentação, Transporte, Saúde, Lazer, Serviços, Salário, Outros'),
          description: z.string().describe('Descrição curta da transação. Máximo 4 palavras.'),
          transaction_date: z.string().describe('Data da transação no formato YYYY-MM-DD. Inferir com base na fala do usuário (ex: hoje, ontem, ou uma data específica).')
        }),
        execute: async ({ type, amount, category, description, transaction_date }) => {
          const { error } = await supabase
            .from('transactions')
            .insert({
              user_id: user.id,
              type,
              amount,
              category,
              description,
              transaction_date
            });
          
          if (error) {
            return { success: false, message: 'Erro ao cadastrar transação: ' + error.message };
          }
          return { success: true, message: 'Transação avulsa cadastrada com sucesso!' };
        }
      }),
      cadastrarContaFixa: tool({
        description: 'Cadastra uma conta, despesa ou receita recorrente MENSAL (fixa).',
        parameters: z.object({
          type: z.enum(['income', 'expense']).describe('O tipo: income ou expense'),
          amount: z.number().describe('O valor da transação'),
          category: z.string().describe('A categoria apropriada'),
          description: z.string().describe('Descrição curta. Máximo 4 palavras.'),
          day_of_month: z.number().describe('O dia do mês que ocorrerá a cobrança/recebimento (1 a 31)'),
          is_business_day: z.boolean().describe('Verdadeiro se o usuário disser que é no "Xº dia útil", falso caso contrário')
        }),
        execute: async ({ type, amount, category, description, day_of_month, is_business_day }) => {
          const { error } = await supabase
            .from('recurring_transactions')
            .insert({
              user_id: user.id,
              type,
              amount,
              category,
              description,
              day_of_month,
              is_business_day
            });

          if (error) {
            return { success: false, message: 'Erro ao cadastrar conta fixa: ' + error.message };
          }
          return { success: true, message: 'Conta fixa recorrente cadastrada com sucesso!' };
        }
      }),
      gerarRelatorio: tool({
        description: 'Busca o histórico, relatórios, resumos ou saldo de transações no banco de dados para um período de datas específico.',
        parameters: z.object({
          report_start_date: z.string().describe('Data de início no formato YYYY-MM-DD'),
          report_end_date: z.string().describe('Data de fim no formato YYYY-MM-DD'),
          report_category: z.string().optional().describe('Categoria a filtrar (se solicitado pelo usuário)'),
          report_type: z.enum(['income', 'expense']).optional().describe('Filtrar apenas despesas ou receitas (se solicitado)')
        }),
        execute: async ({ report_start_date, report_end_date, report_category, report_type }) => {
          let query = supabase
            .from('transactions')
            .select('*')
            .eq('user_id', user.id)
            .gte('transaction_date', report_start_date)
            .lte('transaction_date', report_end_date);

          if (report_category) {
            query = query.ilike('category', `%${report_category}%`);
          }
          if (report_type) {
            query = query.eq('type', report_type);
          }

          const { data: transactions, error } = await query;
          
          if (error || !transactions) {
            return { success: false, message: 'Erro ao buscar dados de relatório no banco de dados.' };
          }

          let income = 0;
          let expense = 0;
          transactions.forEach(t => {
            if (t.type === 'income') income += Number(t.amount);
            else expense += Number(t.amount);
          });

          return { 
            success: true, 
            income, 
            expense, 
            balance: income - expense, 
            transactions_count: transactions.length 
          };
        }
      })
    }
  });

  return result.toDataStreamResponse();
}
