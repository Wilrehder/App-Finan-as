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
3. Se o usuário perguntar o que comprou, no que gastou, qual foi o maior gasto, onde gastou mais, ou pedir detalhes das transações, use a ferramenta 'gerarRelatorio' para buscar as transações daquele período e depois responda descrevendo ou resumindo os gastos detalhadamente de acordo com o pedido.
4. Se o usuário pedir para apagar uma transação, você deve primeiro consultar as transações (com 'gerarRelatorio' para o período relevante) para descobrir o ID da transação e depois chamar 'deletarTransacao'. Confirme o que está apagando.
5. Para metas/objetivos, use 'listarObjetivos' para ver o saldo e progresso das metas, 'criarObjetivo' para criar novos objetivos ou 'registrarAporteObjetivo' para salvar dinheiro nelas.
6. SEMPRE formate valores monetários no padrão brasileiro (ex: R$ 1.500,00).
7. Após usar uma ferramenta, diga ao usuário que a ação foi concluída com sucesso de forma amigável.`,
    messages,
    tools: {
      cadastrarTransacao: tool({
        description: 'Cadastra uma transação avulsa (receita ou despesa) na conta do usuário.',
        inputSchema: z.object({
          type: z.enum(['income', 'expense']).describe('O tipo da transação: income (receita) ou expense (despesa)'),
          amount: z.number().describe('O valor monetário da transação'),
          category: z.string().describe('A categoria. Ex: Alimentação, Transporte, Saúde, Lazer, Serviços, Salário, Outros'),
          description: z.string().describe('Descrição curta da transação. Máximo 4 palavras.'),
          transaction_date: z.string().describe('Data da transação no formato YYYY-MM-DD. Inferir com base na fala do usuário (ex: hoje, ontem, ou uma data específica).')
        }),
        execute: async ({ type, amount, category, description, transaction_date }: {
          type: 'income' | 'expense';
          amount: number;
          category: string;
          description: string;
          transaction_date: string;
        }) => {
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
        inputSchema: z.object({
          type: z.enum(['income', 'expense']).describe('O tipo: income ou expense'),
          amount: z.number().describe('O valor da transação'),
          category: z.string().describe('A categoria apropriada'),
          description: z.string().describe('Descrição curta. Máximo 4 palavras.'),
          day_of_month: z.number().describe('O dia do mês que ocorrerá a cobrança/recebimento (1 a 31)'),
          is_business_day: z.boolean().describe('Verdadeiro se o usuário disser que é no "Xº dia útil", falso caso contrário')
        }),
        execute: async ({ type, amount, category, description, day_of_month, is_business_day }: {
          type: 'income' | 'expense';
          amount: number;
          category: string;
          description: string;
          day_of_month: number;
          is_business_day: boolean;
        }) => {
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
        description: 'Busca a LISTA DETALHADA de transações no banco de dados para um período de datas específico para responder a perguntas sobre onde o usuário gastou, qual o saldo ou transações específicas.',
        inputSchema: z.object({
          report_start_date: z.string().describe('Data de início no formato YYYY-MM-DD'),
          report_end_date: z.string().describe('Data de fim no formato YYYY-MM-DD'),
          report_category: z.string().optional().describe('Categoria a filtrar (se solicitado pelo usuário)'),
          report_type: z.enum(['income', 'expense']).optional().describe('Filtrar apenas despesas ou receitas (se solicitado)')
        }),
        execute: async ({ report_start_date, report_end_date, report_category, report_type }: {
          report_start_date: string;
          report_end_date: string;
          report_category?: string;
          report_type?: 'income' | 'expense';
        }) => {
          let query = supabase
            .from('transactions')
            .select('*')
            .eq('user_id', user.id)
            .gte('transaction_date', report_start_date)
            .lte('transaction_date', report_end_date)
            .order('transaction_date', { ascending: false });

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
          const items = transactions.map(t => ({
            id: t.id,
            type: t.type,
            amount: Number(t.amount),
            category: t.category,
            description: t.description,
            date: t.transaction_date
          }));

          items.forEach(t => {
            if (t.type === 'income') income += t.amount;
            else expense += t.amount;
          });

          return { 
            success: true, 
            income, 
            expense, 
            balance: income - expense, 
            transactions_count: transactions.length,
            transactions: items
          };
        }
      }),
      deletarTransacao: tool({
        description: 'Exclui uma transação existente no banco de dados usando o ID da transação.',
        inputSchema: z.object({
          transaction_id: z.string().describe('O ID (UUID) único da transação a ser excluída. Deve ser obtido previamente consultando as transações.')
        }),
        execute: async ({ transaction_id }: { transaction_id: string }) => {
          const { error } = await supabase
            .from('transactions')
            .delete()
            .eq('id', transaction_id)
            .eq('user_id', user.id);

          if (error) {
            return { success: false, message: 'Erro ao excluir transação: ' + error.message };
          }
          return { success: true, message: 'Transação excluída com sucesso!' };
        }
      }),
      listarObjetivos: tool({
        description: 'Busca a lista de todas as metas financeiras (objetivos) do usuário, incluindo o progresso financeiro e o total guardado em cada uma.',
        inputSchema: z.object({}),
        execute: async () => {
          const { data: goals, error } = await supabase
            .from('goals')
            .select('*, goal_deposits(amount)')
            .eq('user_id', user.id);

          if (error || !goals) {
            return { success: false, message: 'Erro ao buscar objetivos no banco de dados.' };
          }

          const goalsWithProgress = goals.map((goal: any) => {
            const totalSaved = goal.goal_deposits.reduce((acc: number, dep: any) => acc + Number(dep.amount), 0);
            return {
              id: goal.id,
              name: goal.name,
              target_amount: Number(goal.target_amount),
              total_saved: totalSaved,
              remaining_amount: Math.max(0, Number(goal.target_amount) - totalSaved),
              deadline: goal.deadline,
              frequency: goal.frequency,
              payment_day: goal.payment_day,
              icon: goal.icon || '🎯',
              percentage_completed: Number(goal.target_amount) > 0 ? (totalSaved / Number(goal.target_amount)) * 100 : 0
            };
          });

          return { success: true, goals: goalsWithProgress };
        }
      }),
      criarObjetivo: tool({
        description: 'Cria uma nova meta ou objetivo financeiro para o usuário poupar dinheiro.',
        inputSchema: z.object({
          name: z.string().describe('Nome descritivo da meta/objetivo (ex: Viagem para o Rio, Comprar Notebook)'),
          target_amount: z.number().describe('O valor total a ser poupado'),
          deadline: z.string().describe('Data limite para atingir o objetivo no formato YYYY-MM-DD'),
          frequency: z.enum(['daily', 'weekly', 'monthly']).describe('Frequência de aportes/poupança planejada'),
          payment_day: z.number().optional().describe('Dia do mês planejado para o aporte mensal (de 1 a 31)'),
          icon: z.string().optional().describe('Emoji representativo para a meta (ex: 🚗, ✈️, 💻, 🎯)')
        }),
        execute: async ({ name, target_amount, deadline, frequency, payment_day, icon }: {
          name: string;
          target_amount: number;
          deadline: string;
          frequency: 'daily' | 'weekly' | 'monthly';
          payment_day?: number;
          icon?: string;
        }) => {
          const { error } = await supabase
            .from('goals')
            .insert({
              user_id: user.id,
              name,
              target_amount,
              deadline,
              frequency,
              payment_day: payment_day || null,
              icon: icon || '🎯'
            });

          if (error) {
            return { success: false, message: 'Erro ao criar objetivo: ' + error.message };
          }
          return { success: true, message: `Objetivo "${name}" criado com sucesso!` };
        }
      }),
      registrarAporteObjetivo: tool({
        description: 'Registra um novo depósito/aporte (dinheiro guardado) para um objetivo/meta específica.',
        inputSchema: z.object({
          goal_id: z.string().describe('O ID (UUID) do objetivo onde o aporte será adicionado. Você deve primeiro listar os objetivos para achar o ID correto.'),
          amount: z.number().describe('O valor monetário a ser guardado/depositado')
        }),
        execute: async ({ goal_id, amount }: { goal_id: string; amount: number }) => {
          const amountToSave = Math.abs(amount);
          if (amountToSave <= 0) {
            return { success: false, message: 'O valor do aporte deve ser maior que zero.' };
          }

          const now = new Date();
          const brOffset = -3 * 60;
          const brTime = new Date(now.getTime() + (brOffset - now.getTimezoneOffset()) * 60000);
          const todayStr = brTime.toISOString().split('T')[0];

          const { error } = await supabase
            .from('goal_deposits')
            .insert({
              goal_id,
              amount: amountToSave,
              deposit_date: todayStr
            });

          if (error) {
            return { success: false, message: 'Erro ao registrar aporte: ' + error.message };
          }
          return { success: true, message: `Aporte de R$ ${amountToSave.toFixed(2)} registrado com sucesso!` };
        }
      })
    }
  });

  return result.toUIMessageStreamResponse();
}
