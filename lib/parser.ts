import OpenAI from "openai";

export type TransactionType = 'income' | 'expense';
export type ChatIntentType = 'register' | 'register_fixed' | 'incomplete_fixed' | 'report' | 'manage_fixed' | 'delete' | 'reminder' | 'unknown';

export interface ParsedIntent {
  intent: ChatIntentType;
  reply_message?: string;
  
  // Para register/fixed:
  type?: TransactionType;
  amount?: number;
  category?: string;
  description?: string;
  transaction_date?: string; // YYYY-MM-DD
  day_of_month?: number;
  is_business_day?: boolean;
  
  // Para report:
  report_start_date?: string; // YYYY-MM-DD
  report_end_date?: string; // YYYY-MM-DD
  report_period_name?: string;

  // Para reminder:
  remind_at?: string; // HH:MM
  frequency?: 'once' | 'daily' | 'weekly' | 'monthly';
  specific_date?: string;
  day_of_week?: number;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function parseMessage(message: string, context?: Partial<ParsedIntent>): Promise<ParsedIntent | null> {
  if (!message || message.trim() === '') return null;

  // Determinar data base no timezone do Brasil
  const now = new Date();
  const brOffset = -3 * 60; // UTC-3
  const brTime = new Date(now.getTime() + (brOffset - now.getTimezoneOffset()) * 60000);
  
  const todayStr = brTime.toISOString().split('T')[0];
  const currentMonth = brTime.getMonth() + 1;
  const currentYear = brTime.getFullYear();

  const systemPrompt = `Você é o parser de linguagem natural de um assistente financeiro chamado Finchat.
Sua missão é ler o que o usuário digitou e extrair a intenção e os dados financeiros, retornando EXATAMENTE um JSON válido, sem markdown.
Hoje é ${todayStr} (Ano ${currentYear}, Mês ${currentMonth}).

O JSON deve seguir a interface TypeScript:
{
  "intent": "register" | "register_fixed" | "incomplete_fixed" | "report" | "manage_fixed" | "delete" | "reminder" | "unknown",
  "type": "income" | "expense", // OPCIONAL
  "amount": number, // OPCIONAL
  "category": "string", // Ex: Alimentação, Transporte, Moradia, Saúde, Lazer, Serviços, Salário, Outros
  "description": "string", // OPCIONAL (Tente manter curto, máx 4 palavras)
  "transaction_date": "YYYY-MM-DD", // OPCIONAL
  "day_of_month": number, // OPCIONAL
  "is_business_day": boolean, // OPCIONAL
  "report_start_date": "YYYY-MM-DD", // OPCIONAL
  "report_end_date": "YYYY-MM-DD", // OPCIONAL
  "report_period_name": "string", // OPCIONAL (ex: "este mês", "janeiro")
  "remind_at": "HH:MM", // OPCIONAL
  "frequency": "once" | "daily" | "weekly" | "monthly", // OPCIONAL
  "specific_date": "YYYY-MM-DD", // OPCIONAL
  "reply_message": "string" // OBRIGATÓRIO: Crie uma mensagem amigável, humanizada (com emojis curtos) confirmando o que você entendeu e pedindo confirmação.
}

Regras:
1. 'register': Para contas/transações avulsas ("gastei 50 no ifood hoje", "recebi 1000 de pix ontem").
   - 'type' é 'expense' por padrão, a menos que seja claro que é receita (ganhei, recebi, salário).
   - Defina 'amount' (número limpo), 'category' e 'description'.
   - 'transaction_date' DEVE ser inferido e colocado no formato YYYY-MM-DD com base em "ontem", "hoje", ou uma data.
2. 'register_fixed': Para contas fixas/recorrentes ("netflix todo dia 10 custa 40", "salário todo 5 dia útil").
   - 'type' é 'expense' por padrão, a menos que seja claro que é receita. ISSO É OBRIGATÓRIO.
   - Exige preencher 'day_of_month' ou 'is_business_day'.
   - Se faltar o 'amount', retorne intent 'incomplete_fixed' para perguntarmos o valor, MANTENDO o 'type' e 'description' definidos.
3. 'manage_fixed': Se o usuário pedir para ver, editar, cancelar assinaturas fixas ("ver minhas contas fixas").
4. 'delete': Se pedir para apagar/desfazer a última transação ("apaga a última", "desfazer").
5. 'report': Para pedir extratos/resumos ("quanto gastei esse mês?", "resumo de janeiro").
   - Preencha 'report_start_date' e 'report_end_date' baseados no período solicitado, e um 'report_period_name'.
6. 'reminder': Para criar lembretes/alarmes ("me lembre de pagar luz às 10:30 amanhã").
   - Preencha 'remind_at' no formato 24h HH:MM, 'frequency' ('once', 'daily', etc), e a 'description'.
   - Se for 'once', preencha 'specific_date' (YYYY-MM-DD).
8. 'reply_message': Você DEVE formular uma resposta amigável e conversacional como se fosse o Finchat. 
   - Se for 'register', diga algo como: "Pode deixar! 📝 Vou anotar aqui a sua despesa de R$ 50,00 com Alimentação pra hoje. Posso confirmar?"
   - Se for 'incomplete_fixed', faça a pergunta que falta: "Qual é o valor dessa conta?" ou "Qual dia do mês ela vence?"
   - Seja natural e prestativo. Use o estilo de conversa de um assistente de WhatsApp brasileiro.
   - SEMPRE formate valores monetários no padrão brasileiro na resposta (ex: R$ 1.500,00 com ponto de milhar e duas casas decimais).
9. Contexto: O usuário pode estar apenas respondendo a uma pergunta do robô.
   Contexto Atual do Bot: ${JSON.stringify(context || {})}
   - MANTENHA TODOS OS DADOS DO CONTEXTO: Se o contexto existir, você DEVE retornar o JSON com todos os dados do contexto misturados com as novas informações do usuário.
   - Exemplo: Se o contexto dizia 'incomplete_fixed' (faltava o valor, mas tinha description e type) e o usuário disse apenas "50 reais", você deve devolver a mesma conta com tudo que tinha, mudando o 'amount' para 50 e o 'intent' para 'register_fixed'.
10. Se não entender nada, ou for papo furado, retorne {"intent": "unknown", "reply_message": "Putz, não entendi 😅. Como posso te ajudar hoje?"}.
11. RETORNE SOMENTE O JSON PURO. NADA DE TEXTO ADICIONAL.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      response_format: { type: "json_object" },
      temperature: 0.0,
    });

    const content = response.choices[0].message.content;
    if (!content) return null;

    const parsed: ParsedIntent = JSON.parse(content);
    
    if (parsed.intent === 'unknown') return null;

    // Se o GPT esquecer de preencher o transaction_date para 'register', botamos hoje
    if (parsed.intent === 'register' && !parsed.transaction_date) {
      parsed.transaction_date = todayStr;
    }
    
    return parsed;
  } catch (error) {
    console.error("OpenAI Parser Error:", error);
    return null;
  }
}
