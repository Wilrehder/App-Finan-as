export type TransactionType = 'income' | 'expense';
export type ChatIntentType = 'register' | 'register_fixed' | 'report' | 'delete' | 'unknown';

export interface ParsedIntent {
  intent: ChatIntentType;
  
  // Para register:
  type?: TransactionType;
  amount?: number;
  category?: string;
  description?: string;
  transaction_date?: string; // Formato YYYY-MM-DD
  day_of_month?: number; // Para fixed
  
  // Para report:
  report_start_date?: string; // YYYY-MM-DD
  report_end_date?: string; // YYYY-MM-DD
  report_period_name?: string;
}

const EXPENSE_KEYWORDS = ['gasto', 'gastos', 'despesa', 'despesas', 'gastei', 'comprei', 'paguei', 'ifood', 'uber', 'saída', 'pagamento', 'deu', 'custou'];
const INCOME_KEYWORDS = ['receita', 'receitas', 'ganho', 'ganhos', 'recebi', 'ganhei', 'salário', 'pix', 'entrada', 'caiu'];
const REPORT_KEYWORDS = ['relatório', 'resumo', 'extrato', 'saldo', 'balanço', 'total'];
const REPORT_PHRASES = ['quanto gastei', 'quanto recebi', 'meus gastos', 'minhas despesas', 'meus ganhos', 'minhas receitas', 'gastos de', 'despesas de', 'ganhos de', 'receitas de'];
const DELETE_KEYWORDS = ['apagar', 'apague', 'excluir', 'exclua', 'cancelar', 'cancele', 'desfazer', 'desfaça', 'deletar', 'delete'];
const FIXED_KEYWORDS = ['fixo', 'fixa', 'recorrente', 'todo mês', 'todo mes', 'todo dia', 'todos os meses'];

const CATEGORY_MAP: Record<string, string[]> = {
  'Mercado': ['mercado', 'supermercado', 'compras', 'feira', 'açougue', 'padaria'],
  'Transporte': ['transporte', 'uber', '99', 'taxi', 'ônibus', 'gasolina', 'combustível', 'estacionamento', 'pedágio', 'metrô', 'passagem'],
  'Alimentação': ['alimentação', 'comida', 'ifood', 'restaurante', 'lanche', 'pizza', 'hamburguer', 'bar', 'café', 'padoca'],
  'Lazer': ['lazer', 'cinema', 'festa', 'show', 'jogo', 'viagem', 'passeio', 'futebol', 'cerveja'],
  'Saúde': ['saúde', 'farmácia', 'remédio', 'médico', 'consulta', 'hospital', 'dentista', 'terapia'],
  'Moradia': ['moradia', 'aluguel', 'condomínio', 'luz', 'água', 'energia', 'internet', 'casa'],
  'Serviços': ['celular', 'telefone', 'vivo', 'claro', 'tim', 'netflix', 'spotify', 'assinatura', 'academia'],
  'Salário': ['salário', 'pagamento', 'adiantamento', 'vale', 'bônus', 'férias'],
};

const MONTHS_MAP: Record<string, number> = {
  'janeiro': 1, 'jan': 1, 'mês 01': 1, 'mês 1': 1, 'mes 1': 1, 'mes 01': 1,
  'fevereiro': 2, 'fev': 2, 'mês 02': 2, 'mês 2': 2, 'mes 2': 2, 'mes 02': 2,
  'março': 3, 'mar': 3, 'mês 03': 3, 'mês 3': 3, 'mes 3': 3, 'mes 03': 3,
  'abril': 4, 'abr': 4, 'mês 04': 4, 'mês 4': 4, 'mes 4': 4, 'mes 04': 4,
  'maio': 5, 'mai': 5, 'mês 05': 5, 'mês 5': 5, 'mes 5': 5, 'mes 05': 5,
  'junho': 6, 'jun': 6, 'mês 06': 6, 'mês 6': 6, 'mes 6': 6, 'mes 06': 6,
  'julho': 7, 'jul': 7, 'mês 07': 7, 'mês 7': 7, 'mes 7': 7, 'mes 07': 7,
  'agosto': 8, 'ago': 8, 'mês 08': 8, 'mês 8': 8, 'mes 8': 8, 'mes 08': 8,
  'setembro': 9, 'set': 9, 'mês 09': 9, 'mês 9': 9, 'mes 9': 9, 'mes 09': 9,
  'outubro': 10, 'out': 10, 'mês 10': 10, 'mes 10': 10,
  'novembro': 11, 'nov': 11, 'mês 11': 11, 'mes 11': 11,
  'dezembro': 12, 'dez': 12, 'mês 12': 12, 'mes 12': 12
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function formatDate(date: Date) {
  return date.toISOString().split('T')[0];
}

export function parseMessage(message: string): ParsedIntent | null {
  const normalized = message.trim().toLowerCase().replace(/\s+/g, ' ');
  const now = new Date();

  // Verifica se é intenção de Excluir / Desfazer
  for (const word of DELETE_KEYWORDS) {
    if (normalized.includes(word)) {
      return { intent: 'delete' };
    }
  }

  // Tenta encontrar um valor monetário para saber se é intenção de registro
  // Padrões: 50, 50.00, 50,00, R$50, R$ 50,00. Evita anos sozinhos como 2026.
  const amountMatch = normalized.match(/(?:r\$|reais)?\s*(?<!\b202)\b(\d+(?:[.,]\d{1,2})?)\b(?!\s*anos?)/);
  let hasAmount = false;
  let amount = 0;
  if (amountMatch) {
    amount = parseFloat(amountMatch[1].replace(',', '.'));
    if (!isNaN(amount) && amount > 0) {
      hasAmount = true;
    }
  }

  // Verifica se é intenção de Relatório
  let isReport = false;
  
  // 1. Pela palavra chave direta de relatório
  for (const word of [...REPORT_KEYWORDS, ...REPORT_PHRASES]) {
    if (normalized.includes(word)) {
      isReport = true;
      break;
    }
  }

  // 2. Se a frase for muito curta e pedir por períodos sem um valor numérico ("gastos hoje", "despesas de maio")
  if (!isReport && !hasAmount) {
    if (/(gastos?|despesas?|receitas?|ganhos?)\s+(hoje|ontem|nesse|neste|desse|deste|da|do|de|mes|mês|ano|semana)/.test(normalized)) {
      isReport = true;
    }
    // Perguntas puras com interrogação sem valor
    if (normalized.includes('?') && !hasAmount) {
      isReport = true;
    }
  }

  // Se tiver a palavra chave mas claramente a pessoa digitou um valor monetário com a intenção de gravar
  // ex: "resumo da feira deu 50" -> register
  if (isReport && hasAmount) {
    // Se conter "deu 50", "foi 50", "gastei 50", forçamos a ser register
    if (/(deu|foi|gastei|comprei|paguei)\s*(r\$)?\s*\d+/.test(normalized)) {
      isReport = false;
    }
  }

  if (isReport) {
    let start_date = new Date(now.getFullYear(), now.getMonth(), 1);
    let end_date = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    let period_name = "este mês";

    // Detectar ano
    const yearMatch = normalized.match(/(?:no\s+ano\s+de\s+|ano\s+|em\s+)(\d{4})/);
    const targetYear = yearMatch ? parseInt(yearMatch[1]) : now.getFullYear();

    // Detectar mês
    let targetMonth = null;
    for (const [key, val] of Object.entries(MONTHS_MAP)) {
      if (normalized.match(new RegExp(`\\b${key}\\b`))) {
        targetMonth = val;
        period_name = `o mês de ${key.charAt(0).toUpperCase() + key.slice(1)}`;
        break;
      }
    }

    if (normalized.includes('hoje')) {
      start_date = new Date(now);
      end_date = new Date(now);
      period_name = "hoje";
    } else if (normalized.includes('ontem')) {
      start_date = new Date(now);
      start_date.setDate(now.getDate() - 1);
      end_date = new Date(start_date);
      period_name = "ontem";
    } else if (normalized.includes("neste ano") || normalized.includes("desse ano") || yearMatch) {
      if (!targetMonth) {
        start_date = new Date(targetYear, 0, 1);
        end_date = new Date(targetYear, 11, 31);
        period_name = `o ano de ${targetYear}`;
      } else {
        start_date = new Date(targetYear, targetMonth - 1, 1);
        end_date = new Date(targetYear, targetMonth - 1, getDaysInMonth(targetYear, targetMonth));
        if (yearMatch) period_name += ` de ${targetYear}`;
      }
    } else if (targetMonth) {
       start_date = new Date(targetYear, targetMonth - 1, 1);
       end_date = new Date(targetYear, targetMonth - 1, getDaysInMonth(targetYear, targetMonth));
    } else if (normalized.includes("nessa semana") || normalized.includes("nesta semana") || normalized.includes("dessa semana")) {
      const day = now.getDay() || 7; 
      start_date = new Date(now);
      if (day !== 1) start_date.setDate(now.getDate() - (day - 1)); 
      end_date = new Date(start_date);
      end_date.setDate(end_date.getDate() + 6); 
      period_name = "esta semana";
    }

    return {
      intent: 'report',
      report_start_date: formatDate(start_date),
      report_end_date: formatDate(end_date),
      report_period_name: period_name
    };
  }

  // Intenção de Registro
  if (!hasAmount) return null;

  // Inferir o tipo
  let type: TransactionType = 'expense'; // default despesa
  for (const word of INCOME_KEYWORDS) {
    if (normalized.includes(word)) { type = 'income'; break; }
  }
  // Se encontrou gasto também (ex: "gasto do meu salario"), expense tem prioridade se for verbo de despesa,
  // mas vamos apenas garantir que se tem verbo de receita seja receita.
  
  // Inferir a categoria
  let category = 'Outros';
  for (const [catName, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some(k => normalized.includes(k))) {
      category = catName; break;
    }
  }

  // Inferir a data da transação normal
  let transaction_date = new Date(now);
  let day_of_month = now.getDate();
  
  if (normalized.includes('anteontem')) {
    transaction_date.setDate(transaction_date.getDate() - 2);
  } else if (normalized.includes('ontem')) {
    transaction_date.setDate(transaction_date.getDate() - 1);
  } else {
    const dayMatch = normalized.match(/(?:dia|em)\s+(\d{1,2})\b/);
    if (dayMatch) {
      const day = parseInt(dayMatch[1]);
      if (day > 0 && day <= 31) {
        day_of_month = day;
        transaction_date.setDate(day);
        if (day > now.getDate()) {
          transaction_date.setMonth(transaction_date.getMonth() - 1);
        }
      }
    }
  }

  // Verifica se é intenção de Registro Fixo
  let isFixed = false;
  for (const word of FIXED_KEYWORDS) {
    if (normalized.includes(word)) {
      isFixed = true;
      break;
    }
  }

  // A descrição limpa
  let description = message
    .replace(/(?:r\$)?\s*\d+(?:[.,]\d+)?/ig, '')
    .replace(/\breais\b/ig, '')
    .replace(/\b(ontem|anteontem|hoje)\b/ig, '')
    .replace(/(?:dia|em)\s+\d{1,2}\b/ig, '')
    .trim();

  description = description.replace(/^(gasto|despesa|receita|ganho|gastei|comprei|paguei|recebi|ganhei|foi|deu)\s+/i, '');

  if (!description) {
    description = category;
  } else {
    description = description.charAt(0).toUpperCase() + description.slice(1);
  }

  return {
    intent: isFixed ? 'register_fixed' : 'register',
    type,
    amount,
    category,
    description,
    transaction_date: formatDate(transaction_date),
    day_of_month
  };
}
