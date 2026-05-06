export type TransactionType = 'income' | 'expense';
export type ChatIntentType = 'register' | 'register_fixed' | 'incomplete_fixed' | 'report' | 'manage_fixed' | 'delete' | 'unknown';

export interface ParsedIntent {
  intent: ChatIntentType;
  type?: TransactionType;
  amount?: number;
  category?: string;
  description?: string;
  transaction_date?: string; // YYYY-MM-DD
  day_of_month?: number;
  is_business_day?: boolean;
  report_start_date?: string;
  report_end_date?: string;
  report_period_name?: string;
}

// ─── Listas de palavras-chave ────────────────────────────────────────────────
const EXPENSE_KEYWORDS = ['gasto', 'gastos', 'despesa', 'despesas', 'gastei', 'comprei', 'paguei', 'saida', 'deu', 'custou', 'cobrado', 'cobrada', 'custa'];
const INCOME_KEYWORDS  = ['receita', 'receitas', 'ganho', 'ganhos', 'recebi', 'ganhei', 'salario', 'pix', 'entrada', 'caiu', 'renda', 'rendimento'];
const REPORT_KEYWORDS  = ['relatorio', 'resumo', 'extrato', 'saldo', 'balanco', 'total', 'balanço'];
const REPORT_PHRASES   = ['quanto gastei', 'quanto recebi', 'meus gastos', 'minhas despesas', 'meus ganhos', 'minhas receitas', 'gastos de', 'despesas de', 'ganhos de', 'receitas de'];
const DELETE_KEYWORDS  = ['apagar', 'apague', 'excluir', 'exclua', 'cancelar', 'cancele', 'desfazer', 'desfaca', 'deletar', 'delete', 'remover', 'remove'];
const FIXED_KEYWORDS   = ['fixo', 'fixa', 'recorrente', 'todo mes', 'todo dia', 'todos os meses', 'mensal', 'mensalmente', 'sempre no dia', 'sempre dia', 'cada mes', 'todo mes'];

const CATEGORY_MAP: Record<string, string[]> = {
  'Mercado':      ['mercado', 'supermercado', 'compras', 'feira', 'acougue', 'padaria'],
  'Transporte':   ['transporte', 'uber', '99', 'taxi', 'onibus', 'gasolina', 'combustivel', 'estacionamento', 'pedagio', 'metro', 'passagem'],
  'Alimentação':  ['alimentacao', 'comida', 'ifood', 'restaurante', 'lanche', 'pizza', 'hamburguer', 'bar', 'cafe', 'padoca'],
  'Lazer':        ['lazer', 'cinema', 'festa', 'show', 'jogo', 'viagem', 'passeio', 'futebol', 'cerveja'],
  'Saúde':        ['saude', 'farmacia', 'remedio', 'medico', 'consulta', 'hospital', 'dentista', 'terapia'],
  'Moradia':      ['moradia', 'aluguel', 'condominio', 'luz', 'agua', 'energia', 'internet', 'casa'],
  'Serviços':     ['celular', 'telefone', 'vivo', 'claro', 'tim', 'netflix', 'spotify', 'assinatura', 'academia'],
  'Salário':      ['salario', 'pagamento', 'adiantamento', 'vale', 'bonus', 'ferias'],
};

const MONTHS_MAP: Record<string, number> = {
  'janeiro': 1, 'jan': 1, 'fevereiro': 2, 'fev': 2, 'marco': 3, 'mar': 3,
  'abril': 4, 'abr': 4, 'maio': 5, 'mai': 5, 'junho': 6, 'jun': 6,
  'julho': 7, 'jul': 7, 'agosto': 8, 'ago': 8, 'setembro': 9, 'set': 9,
  'outubro': 10, 'out': 10, 'novembro': 11, 'nov': 11, 'dezembro': 12, 'dez': 12,
};

// Ordinais e cardinais por extenso (para "dia cinco", "quinto dia útil", etc.)
const NUMBER_WORDS: Record<string, number> = {
  'um': 1, 'uma': 1, 'primeiro': 1, 'primeira': 1,
  'dois': 2, 'duas': 2, 'segundo': 2, 'segunda': 2,
  'tres': 3, 'terceiro': 3, 'terceira': 3,
  'quatro': 4, 'quarto': 4, 'quarta': 4,
  'cinco': 5, 'quinto': 5, 'quinta': 5,
  'seis': 6, 'sexto': 6, 'sexta': 6,
  'sete': 7, 'setimo': 7, 'setima': 7,
  'oito': 8, 'oitavo': 8, 'oitava': 8,
  'nove': 9, 'nono': 9, 'nona': 9,
  'dez': 10, 'decimo': 10, 'decima': 10,
  'onze': 11, 'undecimo': 11,
  'doze': 12, 'duodecimo': 12,
  'treze': 13, 'quatorze': 14, 'catorze': 14, 'quinze': 15,
  'dezesseis': 16, 'dezessete': 17, 'dezoito': 18, 'dezenove': 19, 'vinte': 20,
  'vinte e um': 21, 'vinte e dois': 22, 'vinte e tres': 23, 'vinte e quatro': 24,
  'vinte e cinco': 25, 'vinte e seis': 26, 'vinte e sete': 27, 'vinte e oito': 28,
  'vinte e nove': 29, 'trinta': 30, 'trinta e um': 31,
};

function normalize(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// ─── Parser de valor monetário (suporta "mil", "reais", notações) ─────────────
function parseAmount(normalized: string): number | null {
  // Padrão com "mil": "20 mil", "20mil", "vinte mil", "R$ 5 mil"
  const milMatch = normalized.match(/(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)\s*mil\b/);
  if (milMatch) {
    const base = parseFloat(milMatch[1].replace(',', '.'));
    if (!isNaN(base)) return base * 1000;
  }

  // Padrão explícito: R$ 50, R$50, 50 reais, R$ 50,00
  const explicitMatch = normalized.match(/(?:r\$\s*)(\d+(?:[.,]\d{1,2})?)|(\d+(?:[.,]\d{1,2})?)\s*(?:reais?|r\$)/);
  if (explicitMatch) {
    const val = parseFloat((explicitMatch[1] || explicitMatch[2]).replace(',', '.'));
    if (!isNaN(val) && val > 0) return val;
  }

  // Padrão implícito (número solto, mas evita anos e dias > contexto)
  const implicitMatch = normalized.match(/\b(\d{1,6}(?:[.,]\d{1,2})?)\b(?!\s*(?:anos?|\/|:))/);
  if (implicitMatch) {
    const val = parseFloat(implicitMatch[1].replace(',', '.'));
    // Evitar anos (>=1900 <=2100) e números muito grandes sem contexto
    if (!isNaN(val) && val > 0 && !(val >= 1900 && val <= 2100)) return val;
  }

  return null;
}

// ─── Parser de dia do mês (numérico ou por extenso) ──────────────────────────
function parseDayOfMonth(normalized: string): { day: number; isBusinessDay: boolean } | null {
  // Dia útil: "5º dia útil", "quinto dia útil", "dia útil 5"
  const businessNum = normalized.match(/(\d{1,2})[oº°]?\s*dia\s*util|dia\s*util\s*(\d{1,2})/);
  if (businessNum) {
    const day = parseInt(businessNum[1] || businessNum[2]);
    if (day > 0 && day <= 31) return { day, isBusinessDay: true };
  }

  // Dia útil por extenso: "quinto dia útil"
  for (const [word, val] of Object.entries(NUMBER_WORDS)) {
    const re = new RegExp(`\\b${word}\\s*(?:[oaº]\\s*)?dia\\s*util`, 'i');
    if (re.test(normalized)) return { day: val, isBusinessDay: true };
  }

  // "todo dia 5", "dia 5", "dia cinco", "no dia 5", "sempre no dia 5"
  // Numérico
  const dayNum = normalized.match(/(?:todo\s+)?(?:dia|no\s+dia|sempre\s+(?:no\s+)?dia|em)\s+(\d{1,2})\b/);
  if (dayNum) {
    const day = parseInt(dayNum[1]);
    if (day > 0 && day <= 31) return { day, isBusinessDay: false };
  }

  // Por extenso: "todo dia cinco", "dia cinco"
  // Match multi-word numbers first (ex: "vinte e cinco")
  const multiWordNums = Object.entries(NUMBER_WORDS)
    .filter(([k]) => k.includes(' '))
    .sort((a, b) => b[0].length - a[0].length);

  for (const [word, val] of multiWordNums) {
    const re = new RegExp(`(?:todo\\s+)?dia\\s+${word}\\b`, 'i');
    if (re.test(normalized)) return { day: val, isBusinessDay: false };
  }

  for (const [word, val] of Object.entries(NUMBER_WORDS)) {
    if (word.includes(' ')) continue;
    const re = new RegExp(`(?:todo\\s+)?(?:dia|no\\s+dia)\\s+${word}\\b`, 'i');
    if (re.test(normalized)) return { day: val, isBusinessDay: false };
  }

  return null;
}

// ─── Limpeza de descrição ─────────────────────────────────────────────────────
function cleanDescription(message: string, normalized: string): string {
  let desc = message;

  // Remove valores monetários
  desc = desc.replace(/r\$\s*\d+(?:[.,]\d{1,2})?(\s*mil)?/gi, '');
  desc = desc.replace(/\d+(?:[.,]\d{1,2})?\s*mil\s*(?:reais?)?/gi, '');
  desc = desc.replace(/\d+(?:[.,]\d{1,2})?\s*(?:reais?)/gi, '');

  // Remove menções de dia/data
  desc = desc.replace(/(?:todo\s+)?(?:dia|no\s+dia|sempre\s+(?:no\s+)?dia)\s+(?:\d{1,2}|[a-zà-ú]+(?:\s+e\s+[a-zà-ú]+)?)/gi, '');
  desc = desc.replace(/(?:hoje|ontem|anteontem)/gi, '');
  desc = desc.replace(/(?:\d{1,2})[oº°]?\s*dia\s*[uú]til/gi, '');
  desc = desc.replace(/(?:primeiro|segundo|terceiro|quarto|quinto|sexto|s[eé]timo|oitavo|nono|d[eé]cimo)\s+dia\s*[uú]til/gi, '');

  // Remove palavras de intenção
  desc = desc.replace(/\b(adicione|adicionar|adiciona|registre|registrar|registra|cadastre|cadastrar|anote|anotar|coloque|quero|preciso|pode|pra mim)\b/gi, '');
  desc = desc.replace(/\b(uma|um|minha|meu|de|do|da|no|na|em|para|pra|por|com|que|e|a|o|é|eh)\b/gi, ' ');

  // Remove keywords de fixo
  desc = desc.replace(/\b(fixo|fixa|recorrente|todo\s+mes|todos\s+os\s+meses|mensal|mensalmente|sempre|cada\s+mes)\b/gi, '');

  // Remove keywords de tipo
  desc = desc.replace(/\b(despesa|receita|gasto|ganho|entrada|saida|renda|rendimento)\b/gi, '');

  // Limpa espaços múltiplos e pontuação sobrando
  desc = desc.replace(/\s+/g, ' ').replace(/^[\s,;.]+|[\s,;.]+$/g, '').trim();

  return desc || 'Transação';
}

// ─── Função principal ─────────────────────────────────────────────────────────
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

  // ── Delete
  for (const word of DELETE_KEYWORDS) {
    if (normalized.includes(word)) return { intent: 'delete' };
  }

  // ── Herda contexto de conversa em andamento
  const inheritedType = context?.type;
  const inheritedAmount = context?.amount;
  const inheritedCategory = context?.category;
  const inheritedDescription = context?.description;
  const inheritedIsFixed =
    context?.intent === 'register_fixed' || context?.intent === 'incomplete_fixed';

  // ── Detecta se é fixo
  let isFixed = inheritedIsFixed;
  for (const word of FIXED_KEYWORDS) {
    if (normalized.includes(word)) { isFixed = true; break; }
  }

  // ── Detecta se é relatório
  let isReport = false;
  for (const word of [...REPORT_KEYWORDS, ...REPORT_PHRASES]) {
    if (normalized.includes(word)) { isReport = true; break; }
  }
  if (!isReport && !inheritedAmount) {
    if (/(gastos?|despesas?|receitas?|ganhos?)\s+(hoje|ontem|nesse|neste|desse|deste|da|do|de|mes|mês|ano|semana)/.test(normalized)) {
      isReport = true;
    }
    if (normalized.endsWith('?') && !normalized.match(/\d/)) isReport = true;
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
      start_date = end_date = new Date(now);
      period_name = 'hoje';
    } else if (normalized.includes('ontem')) {
      start_date = end_date = new Date(now);
      start_date.setDate(now.getDate() - 1);
      end_date = new Date(start_date);
      period_name = 'ontem';
    } else if (normalized.includes('neste ano') || normalized.includes('desse ano') || yearMatch) {
      if (!targetMonth) {
        start_date = new Date(targetYear, 0, 1);
        end_date   = new Date(targetYear, 11, 31);
        period_name = `o ano de ${targetYear}`;
      } else {
        start_date = new Date(targetYear, targetMonth - 1, 1);
        end_date   = new Date(targetYear, targetMonth - 1, getDaysInMonth(targetYear, targetMonth));
        if (yearMatch) period_name += ` de ${targetYear}`;
      }
    } else if (targetMonth) {
      start_date = new Date(targetYear, targetMonth - 1, 1);
      end_date   = new Date(targetYear, targetMonth - 1, getDaysInMonth(targetYear, targetMonth));
    } else if (/(nessa|nesta|dessa)\s+semana/.test(normalized)) {
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
      report_period_name: period_name
    };
  }

  // ── Parseia valor
  const amount = parseAmount(normalized) ?? inheritedAmount;
  const hasAmount = !!amount;

  // ── Parseia tipo
  let type: TransactionType = inheritedType || 'expense';
  for (const w of INCOME_KEYWORDS)  { if (normalized.includes(w)) { type = 'income';  break; } }
  // Despesa tem prioridade sobre receita se houver verbo de despesa explícito
  if (type === 'income') {
    for (const w of EXPENSE_KEYWORDS) {
      if (normalized.includes(w)) { type = 'expense'; break; }
    }
  }
  // Mas se vier "receita/renda/ganho" não deixa sobrescrever
  for (const w of INCOME_KEYWORDS) {
    if (normalized.includes(w)) { type = 'income'; break; }
  }

  // ── Parseia categoria
  let category = inheritedCategory || 'Outros';
  for (const [catName, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some(k => normalized.includes(k))) { category = catName; break; }
  }

  // ── Parseia dia (fixo ou normal)
  const dayParsed = parseDayOfMonth(normalized);
  const day_of_month   = dayParsed?.day ?? context?.day_of_month;
  const is_business_day = dayParsed?.isBusinessDay ?? context?.is_business_day ?? false;

  // ── Descrição
  const description = inheritedDescription || cleanDescription(message, normalized) || category;

  // ── Fluxo para FIXED
  if (isFixed) {
    if (!hasAmount) {
      return {
        intent: 'incomplete_fixed',
        type,
        category,
        description: inheritedDescription,
      };
    }
    if (!day_of_month) {
      return {
        intent: 'incomplete_fixed',
        type,
        amount,
        category,
        description,
      };
    }
    return {
      intent: 'register_fixed',
      type,
      amount,
      category,
      description,
      day_of_month,
      is_business_day,
    };
  }

  // ── Fluxo para REGISTRO NORMAL
  if (!hasAmount) return null;

  // Data da transação normal
  let transaction_date = new Date(now);

  if (normalized.includes('anteontem')) {
    transaction_date.setDate(transaction_date.getDate() - 2);
  } else if (normalized.includes('ontem')) {
    transaction_date.setDate(transaction_date.getDate() - 1);
  } else if (day_of_month && !isFixed) {
    transaction_date.setDate(day_of_month);
    if (day_of_month > now.getDate()) {
      transaction_date.setMonth(transaction_date.getMonth() - 1);
    }
  }
  // Se não informou data → usa hoje (não pergunta)

  return {
    intent: 'register',
    type,
    amount,
    category,
    description,
    transaction_date: formatDate(transaction_date),
  };
}
