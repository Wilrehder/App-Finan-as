export type TransactionType = 'income' | 'expense';
export type ChatIntentType = 'register' | 'register_fixed' | 'incomplete_fixed' | 'report' | 'manage_fixed' | 'delete' | 'reminder' | 'unknown';

export interface ParsedIntent {
  intent: ChatIntentType;
  
  // Para register:
  type?: TransactionType;
  amount?: number;
  category?: string;
  description?: string;
  transaction_date?: string; // Formato YYYY-MM-DD
  day_of_month?: number; // Para fixed
  is_business_day?: boolean; // Para fixed
  
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

// ─── Keywords ────────────────────────────────────────────────────────────────
const EXPENSE_KEYWORDS = ['gasto', 'gastos', 'despesa', 'despesas', 'gastei', 'comprei', 'paguei', 'ifood', 'uber', 'saida', 'pagamento', 'deu', 'custou', 'custa', 'cobrado', 'cobrada'];
const INCOME_KEYWORDS  = ['receita', 'receitas', 'ganho', 'ganhos', 'recebi', 'ganhei', 'salario', 'pix', 'entrada', 'caiu', 'renda', 'rendimento'];
const REPORT_KEYWORDS  = ['relatorio', 'resumo', 'extrato', 'saldo', 'balanco', 'total', 'balanco'];
const REPORT_PHRASES   = ['quanto gastei', 'quanto recebi', 'meus gastos', 'minhas despesas', 'meus ganhos', 'minhas receitas', 'gastos de', 'despesas de', 'ganhos de', 'receitas de'];
const DELETE_KEYWORDS  = ['apagar', 'apague', 'excluir', 'exclua', 'cancelar', 'cancele', 'desfazer', 'desfaca', 'deletar', 'delete', 'remover', 'remove'];
const FIXED_KEYWORDS   = ['fixo', 'fixa', 'recorrente', 'todo mes', 'todo dia', 'todos os meses', 'mensal', 'sempre no dia', 'sempre dia'];

const CATEGORY_MAP: Record<string, string[]> = {
  'Mercado':     ['mercado', 'supermercado', 'compras', 'feira', 'acougue', 'padaria'],
  'Transporte':  ['transporte', 'uber', '99', 'taxi', 'onibus', 'gasolina', 'combustivel', 'estacionamento', 'pedagio', 'metro', 'passagem'],
  'Alimentação': ['alimentacao', 'comida', 'ifood', 'restaurante', 'lanche', 'pizza', 'hamburguer', 'bar', 'cafe', 'padoca', 'almoco', 'jantar'],
  'Lazer':       ['lazer', 'cinema', 'festa', 'show', 'jogo', 'viagem', 'passeio', 'futebol', 'cerveja'],
  'Saúde':       ['saude', 'farmacia', 'remedio', 'medico', 'consulta', 'hospital', 'dentista', 'terapia'],
  'Moradia':     ['moradia', 'aluguel', 'condominio', 'luz', 'agua', 'energia', 'internet', 'casa'],
  'Serviços':    ['celular', 'telefone', 'vivo', 'claro', 'tim', 'netflix', 'spotify', 'assinatura', 'academia'],
  'Salário':     ['salario', 'pagamento', 'adiantamento', 'vale', 'bonus', 'ferias'],
};

const MONTHS_MAP: Record<string, number> = {
  'janeiro': 1, 'jan': 1, 'mes 01': 1, 'mes 1': 1,
  'fevereiro': 2, 'fev': 2, 'mes 02': 2, 'mes 2': 2,
  'marco': 3, 'mar': 3, 'mes 03': 3, 'mes 3': 3,
  'abril': 4, 'abr': 4, 'mes 04': 4, 'mes 4': 4,
  'maio': 5, 'mai': 5, 'mes 05': 5, 'mes 5': 5,
  'junho': 6, 'jun': 6, 'mes 06': 6, 'mes 6': 6,
  'julho': 7, 'jul': 7, 'mes 07': 7, 'mes 7': 7,
  'agosto': 8, 'ago': 8, 'mes 08': 8, 'mes 8': 8,
  'setembro': 9, 'set': 9, 'mes 09': 9, 'mes 9': 9,
  'outubro': 10, 'out': 10, 'mes 10': 10,
  'novembro': 11, 'nov': 11, 'mes 11': 11,
  'dezembro': 12, 'dez': 12, 'mes 12': 12,
};

// Ordinais e cardinais por extenso — usados para dia do mês
const ORDINAL_MAP: Record<string, number> = {
  'primeiro': 1, 'segundo': 2, 'terceiro': 3, 'quarto': 4, 'quinto': 5,
  'sexto': 6, 'setimo': 7, 'oitavo': 8, 'nono': 9, 'decimo': 10,
  // cardinais por extenso para "todo dia cinco"
  'um': 1, 'uma': 1, 'dois': 2, 'duas': 2, 'tres': 3, 'quatro': 4,
  'cinco': 5, 'seis': 6, 'sete': 7, 'oito': 8, 'nove': 9, 'dez': 10,
  'onze': 11, 'doze': 12, 'treze': 13, 'quatorze': 14, 'catorze': 14,
  'quinze': 15, 'dezesseis': 16, 'dezessete': 17, 'dezoito': 18,
  'dezenove': 19, 'vinte': 20,
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function formatDate(date: Date) {
  return date.toISOString().split('T')[0];
}

function normalize(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// ─── Normaliza formatos numéricos BR antes de parsear ───────────────────────────
// Converte "R$20.000" → "r$20000" e "1.500,50" → "1500.50" antes de parsear
function normalizeBRNumbers(str: string): string {
  // Formato: N.NNN,CC ou N.NNN (separador de milhar = ponto, decimal = vírgula)
  // Ex: "20.000,50" → "20000.50", "1.500" → "1500", "R$20.000" → "r$20000"
  return str
    // N.NNN,CC → NNNN.CC
    .replace(/(\d{1,3})(?:\.(\d{3})),([0-9]{1,2})/g, (_, a, b, c) => `${a}${b}.${c}`)
    // N.NNN (sem casa decimal — claramente milhar pois têm exatamente 3 dígitos após o ponto)
    .replace(/(\d{1,3})\.(\d{3})(?!\d|[.,])/g, (_, a, b) => `${a}${b}`)
    // N,CC → N.CC (decimal com vírgula)
    .replace(/(\d),(\d{1,2})(?!\d)/g, (_, a, b) => `${a}.${b}`);
}

// Números por extenso como multiplicadores de mil
const MIL_PREFIXES: Record<string, number> = {
  'um': 1, 'uma': 1, 'dois': 2, 'duas': 2, 'tres': 3, 'quatro': 4, 'cinco': 5,
  'seis': 6, 'sete': 7, 'oito': 8, 'nove': 9, 'dez': 10, 'vinte': 20,
  'trinta': 30, 'quarenta': 40, 'cinquenta': 50, 'sessenta': 60,
  'setenta': 70, 'oitenta': 80, 'noventa': 90, 'cem': 100, 'cento': 100,
};

// ─── Extrai valor monetário — suporta "mil", ordinais e formatos pt-BR ───────
// Remove primeiros os indicadores de dia para não confundir "dia 10" com valor
function extractAmount(raw: string): number | null {
  // 1. Normaliza separadores BR antes de qualquer coisa
  let normalized = normalizeBRNumbers(raw);

  // 2. Remove "todo dia N", "dia N", "dia util N" para não capturar o número do dia como valor
  normalized = normalized
    .replace(/(?:todo\s+)?(?:dia|no\s+dia|sempre\s+(?:no\s+)?dia)\s+\d{1,2}\b/g, '')
    .replace(/\d{1,2}[oº]?\s*dia\s*[uu]til/g, '')
    .replace(/dia\s*[uu]til\s*\d{1,2}/g, '')
    .trim();

  // 3. "X mil" com X numérico: "20 mil", "20.5 mil", "R$ 5 mil"
  const numMilMatch = normalized.match(/(?:r\$\s*)?(\d+(?:\.\d{1,2})?)\s*mil(?:\s+reais?)?(?![a-z])/i);
  if (numMilMatch) {
    const base = parseFloat(numMilMatch[1]);
    if (!isNaN(base) && base > 0) return base * 1000;
  }

  // 4. "X mil" com X por extenso: "vinte mil", "dois mil"
  for (const [word, val] of Object.entries(MIL_PREFIXES)) {
    const re = new RegExp(`\\b${word}\\s+mil(?:\\s+reais?)?\\b`, 'i');
    if (re.test(normalized)) return val * 1000;
  }

  // 5. "mil reais" ou apenas "mil" sozinho = 1000
  if (/\bmil(?:\s+reais?)?\b/.test(normalized)) return 1000;

  // 6. Explícito sem "mil": "R$ 50", "50 reais"
  const explicitMatch = normalized.match(/r\$\s*(\d+(?:\.\d{1,2})?)|(\d+(?:\.\d{1,2})?)\s*reais?\b/);
  if (explicitMatch) {
    const val = parseFloat(explicitMatch[1] || explicitMatch[2]);
    if (!isNaN(val) && val > 0) return val;
  }

  // 7. Implícito: número solto (ex: "gastei 50")
  const implicitMatch = normalized.match(/\b(\d{1,8}(?:\.\d{1,2})?)\b(?!\s*(?:anos?|\/|:))/);
  if (implicitMatch) {
    const val = parseFloat(implicitMatch[1]);
    // Evita anos (1900-2100)
    if (!isNaN(val) && val > 0 && !(val >= 1900 && val <= 2100)) return val;
  }

  return null;
}

export function parseMessage(message: string, context?: Partial<ParsedIntent>): ParsedIntent | null {
  const normalized = normalize(message).trim().replace(/\s+/g, ' ');
  const now = new Date();

  // ── Gerenciar contas fixas
  if (
    normalized.match(/(editar|gerenciar|ver|visualizar|alterar|modificar)\s+.*(fixa|fixo|recorrente)/) ||
    normalized.match(/minhas\s+(contas\s+fixas|despesas\s+fixas|receitas\s+fixas)/)
  ) {
    return { intent: 'manage_fixed' };
  }

  // ── Lembretes / Notificações customizadas
  if (
    normalized.match(/(lembre|lembrar|notificacao|notificar|me avise|avisa|alerta)/) ||
    normalized.startsWith('lembrete')
  ) {
    let frequency: 'once' | 'daily' | 'weekly' | 'monthly' = 'once';
    if (normalized.includes('todo dia') || normalized.includes('diariamente')) frequency = 'daily';
    else if (normalized.includes('toda semana') || normalized.includes('semanal')) frequency = 'weekly';
    else if (normalized.includes('todo mes') || normalized.includes('mensal')) frequency = 'monthly';

    // Extrai hora: "as 10h", "as 10:30", "10:00"
    const timeMatch = normalized.match(/(?:as\s+)?(\d{1,2})(?::(\d{2}))?\s*h?/);
    const remind_at = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${(timeMatch[2] || '00')}` : '09:00';

    // Extrai dia do mês se mensal
    let dom = undefined;
    if (frequency === 'monthly') {
      const dMatch = normalized.match(/dia\s+(\d{1,2})/);
      if (dMatch) dom = parseInt(dMatch[1]);
    }

    // Extrai data específica se 'once'
    let specDate = undefined;
    if (frequency === 'once') {
      if (normalized.includes('amanha')) {
        const d = new Date(now); d.setDate(d.getDate() + 1);
        specDate = formatDate(d);
      } else if (normalized.includes('hoje')) {
        specDate = formatDate(now);
      }
    }

    // Extrai descrição
    let description = message
      .replace(/(lembre-me|lembre|lembrar|notificacao|notificar|me avise|avisa|alerta|lembrete)/ig, '')
      .replace(/(?:as\s+)?\d{1,2}(?::\d{2})?\s*h?/ig, '')
      .replace(/(todo dia|diariamente|toda semana|semanal|todo mes|mensal|amanha|hoje)/ig, '')
      .replace(/\b(de|do|da|para|pra|em|que)\b/ig, '')
      .trim();
    
    if (!description) description = "Lembrete";
    else description = description.charAt(0).toUpperCase() + description.slice(1);

    return {
      intent: 'reminder',
      description,
      remind_at,
      frequency,
      specific_date: specDate,
      day_of_month: dom
    };
  }

  // ── Detecta fixo (herda contexto também)
  let isFixed = context?.intent === 'register_fixed' || context?.intent === 'incomplete_fixed';
  for (const word of FIXED_KEYWORDS) {
    if (normalized.includes(word)) { isFixed = true; break; }
  }

  // ── Delete
  for (const word of DELETE_KEYWORDS) {
    if (normalized.includes(word)) return { intent: 'delete' };
  }

  // ── Extrai valor (com suporte a "mil")
  const rawAmount = extractAmount(normalized);
  let hasAmount = context?.amount ? true : false;
  let amount = context?.amount || 0;

  if (rawAmount !== null) {
    const isExplicit = normalized.includes('r$') || normalized.includes('reais') || normalized.includes('mil');
    if (isExplicit || !hasAmount) {
      amount = rawAmount;
      hasAmount = true;
    }
  }

  // ── Detecta relatório
  let isReport = false;
  for (const word of [...REPORT_KEYWORDS, ...REPORT_PHRASES]) {
    if (normalized.includes(word)) { isReport = true; break; }
  }

  if (!isReport && !hasAmount) {
    if (/(gastos?|despesas?|receitas?|ganhos?)\s+(hoje|ontem|nesse|neste|desse|deste|da|do|de|mes|mês|ano|semana)/.test(normalized)) {
      isReport = true;
    }
    if (normalized.includes('?') && !hasAmount) isReport = true;
  }

  // "resumo da feira deu 50" → register, não report
  if (isReport && hasAmount) {
    if (/(deu|foi|gastei|comprei|paguei)\s*(r\$)?\s*\d+/.test(normalized)) {
      isReport = false;
    }
  }

  if (isReport) {
    let start_date = new Date(now.getFullYear(), now.getMonth(), 1);
    let end_date   = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    let period_name = 'este mês';

    const yearMatch = normalized.match(/(?:no\s+ano\s+de\s+|ano\s+|em\s+)(\d{4})/);
    const targetYear = yearMatch ? parseInt(yearMatch[1]) : now.getFullYear();

    let targetMonth: number | null = null;
    for (const [key, val] of Object.entries(MONTHS_MAP)) {
      if (normalized.match(new RegExp(`\\b${key}\\b`))) {
        targetMonth = val;
        period_name = `o mês de ${key.charAt(0).toUpperCase() + key.slice(1)}`;
        break;
      }
    }

    if (normalized.includes('hoje')) {
      start_date = new Date(now); end_date = new Date(now); period_name = 'hoje';
    } else if (normalized.includes('ontem')) {
      start_date = new Date(now); start_date.setDate(now.getDate() - 1); end_date = new Date(start_date); period_name = 'ontem';
    } else if (normalized.includes('neste ano') || normalized.includes('desse ano') || yearMatch) {
      if (!targetMonth) {
        start_date = new Date(targetYear, 0, 1); end_date = new Date(targetYear, 11, 31); period_name = `o ano de ${targetYear}`;
      } else {
        start_date = new Date(targetYear, targetMonth - 1, 1);
        end_date   = new Date(targetYear, targetMonth - 1, getDaysInMonth(targetYear, targetMonth));
        if (yearMatch) period_name += ` de ${targetYear}`;
      }
    } else if (targetMonth) {
      start_date = new Date(targetYear, targetMonth - 1, 1);
      end_date   = new Date(targetYear, targetMonth - 1, getDaysInMonth(targetYear, targetMonth));
    } else if (normalized.includes('nessa semana') || normalized.includes('nesta semana') || normalized.includes('dessa semana')) {
      const day = now.getDay() || 7;
      start_date = new Date(now);
      if (day !== 1) start_date.setDate(now.getDate() - (day - 1));
      end_date = new Date(start_date);
      end_date.setDate(end_date.getDate() + 6);
      period_name = 'esta semana';
    }

    return {
      intent: 'report',
      report_start_date: formatDate(start_date),
      report_end_date: formatDate(end_date),
      report_period_name: period_name,
    };
  }

  // ── Se fixo sem valor → incompleto
  if (!hasAmount && isFixed) {
    return {
      intent: 'incomplete_fixed',
      type: normalized.includes('receita') || normalized.includes('ganho') || normalized.includes('renda') ? 'income' : 'expense',
    };
  }

  if (!hasAmount) return null;

  // ── Tipo (income/expense)
  let type: TransactionType = context?.type || 'expense';
  for (const word of INCOME_KEYWORDS) {
    if (normalized.includes(word)) { type = 'income'; break; }
  }
  // Verbos de despesa explícitos têm prioridade apenas se não houver keyword de receita
  if (type === 'expense') {
    // já é despesa por padrão, OK
  }

  // ── Categoria
  let category = context?.category || 'Outros';
  for (const [catName, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some(k => normalized.includes(k))) { category = catName; break; }
  }

  // ── Dia do mês (numérico ou por extenso)
  let transaction_date = new Date(now);
  let day_of_month = context?.day_of_month;
  let is_business_day = context?.is_business_day || false;

  if (normalized.includes('anteontem')) {
    transaction_date.setDate(transaction_date.getDate() - 2);
  } else if (normalized.includes('ontem')) {
    transaction_date.setDate(transaction_date.getDate() - 1);
  } else {
    // Dia útil numérico: "5º dia útil", "dia útil 5"
    const businessDayMatch = normalized.match(
      /(?:(primeiro|segundo|terceiro|quarto|quinto|sexto|setimo|oitavo|nono|decimo|\d{1,2})[oº]?\s*dia\s*util|dia\s*util\s*(\d{1,2}))/
    );
    if (businessDayMatch) {
      const dayVal = businessDayMatch[1] || businessDayMatch[2];
      day_of_month = ORDINAL_MAP[dayVal] ?? parseInt(dayVal);
      is_business_day = true;
    } else {
      // Dia numérico: "dia 5", "todo dia 5", "sempre no dia 5"
      const dayMatch = normalized.match(/(?:todo\s+)?(?:dia|sempre\s+(?:no\s+)?dia|no\s+dia|em)\s+(\d{1,2})\b/);
      if (dayMatch) {
        const day = parseInt(dayMatch[1]);
        if (day > 0 && day <= 31) {
          day_of_month = day;
          if (!isFixed) {
            transaction_date.setDate(day);
            if (day > now.getDate()) transaction_date.setMonth(transaction_date.getMonth() - 1);
          }
        }
      } else {
        // Dia por extenso: "todo dia cinco", "dia cinco" — usa ORDINAL_MAP
        for (const [word, val] of Object.entries(ORDINAL_MAP)) {
          const re = new RegExp(`(?:todo\\s+)?(?:dia|sempre\\s+(?:no\\s+)?dia|no\\s+dia)\\s+${word}\\b`);
          if (re.test(normalized)) {
            day_of_month = val;
            if (!isFixed) {
              transaction_date.setDate(val);
              if (val > now.getDate()) transaction_date.setMonth(transaction_date.getMonth() - 1);
            }
            break;
          }
        }
      }
    }
  }

  // ── Fixo sem dia → incompleto
  if (isFixed && !day_of_month) {
    let description = context?.description || message
      .replace(/(?:r\$)?\s*\d+(?:[.,]\d+)?(\s*mil)?/ig, '')
      .replace(/\breais?\b/ig, '')
      .replace(/\b(ontem|anteontem|hoje)\b/ig, '')
      .replace(/(?:todo\s+)?(?:dia|sempre\s+(?:no\s+)?dia|no\s+dia)\s+\d{1,2}\b/ig, '')
      .trim();
    description = description.replace(/^(gasto|despesa|receita|ganho|gastei|comprei|paguei|recebi|ganhei|foi|deu|adicione|adicionar|registre|cadastre)\s+/i, '').trim();
    if (!description) description = category;
    else description = description.charAt(0).toUpperCase() + description.slice(1);

    return { intent: 'incomplete_fixed', type, amount, category, description };
  }

  // ── Monta descrição
  let description = context?.description || message
    .replace(/(?:r\$)?\s*\d+(?:[.,]\d+)?(\s*mil)?/ig, '')
    .replace(/\breais?\b/ig, '')
    .replace(/\b(ontem|anteontem|hoje)\b/ig, '')
    .replace(/(?:todo\s+)?(?:dia|sempre\s+(?:no\s+)?dia|no\s+dia)\s+\d{1,2}\b/ig, '')
    .replace(/(?:todo\s+)?(?:dia|sempre\s+(?:no\s+)?dia|no\s+dia)\s+(?:um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|quatorze|catorze|quinze|dezesseis|dezessete|dezoito|dezenove|vinte|primeiro|segundo|terceiro|quarto|quinto|sexto|setimo|oitavo|nono|decimo)\b/ig, '')
    .trim();

  description = description.replace(/^(gasto|despesa|receita|ganho|gastei|comprei|paguei|recebi|ganhei|foi|deu|adicione|adicionar|registre|registrar|cadastre|anote|anotar)\s+/i, '').trim();

  // Remove ruído extra de início
  description = description.replace(/^(uma?|um|de|do|da|no|na|em|para|pra|por)\s+/i, '').trim();

  if (!description) description = category;
  else description = description.charAt(0).toUpperCase() + description.slice(1);

  return {
    intent: isFixed ? 'register_fixed' : 'register',
    type,
    amount,
    category,
    description,
    transaction_date: formatDate(transaction_date),
    day_of_month: isFixed ? day_of_month : undefined,
    is_business_day,
  };
}
