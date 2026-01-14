
/**
 * Utilitários de formatação e manipulação de dados para LegalPro CRM
 */

// --- MOEDA (R$) ---

/**
 * Formata um número para string de moeda brasileira: R$ 0.000,00
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

/**
 * Transforma uma entrada de texto em valor monetário inteligente (inicia em centavos)
 */
export const maskCurrency = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  const numberValue = Number(digits) / 100;
  return formatCurrency(numberValue);
};

/**
 * Extrai o valor numérico puro de uma string formatada como moeda
 */
export const parseCurrency = (value: string): number => {
  const digits = value.replace(/\D/g, "");
  return Number(digits) / 100;
};

// --- DATAS (dd/mm/aaaa) ---

/**
 * Retorna a data atual no formato dd/mm/aaaa
 */
export const getTodayBR = (): string => {
  return new Date().toLocaleDateString('pt-BR');
};

/**
 * Aplica máscara dd/mm/aaaa em tempo real durante a digitação
 */
export const maskDate = (value: string): string => {
  let v = value.replace(/\D/g, "").slice(0, 8);
  if (v.length >= 5) {
    return `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`;
  } else if (v.length >= 3) {
    return `${v.slice(0, 2)}/${v.slice(2)}`;
  }
  return v;
};

/**
 * Converte data ISO (yyyy-mm-dd) para BR (dd/mm/aaaa)
 */
export const toBRDate = (isoDate: string): string => {
  if (!isoDate || typeof isoDate !== 'string') return "";
  if (isoDate.includes('/')) return isoDate;
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

/**
 * Converte data BR (dd/mm/aaaa) para ISO (yyyy-mm-dd)
 */
export const toISODate = (brDate: string): string => {
  if (!brDate || !brDate.includes('/')) return brDate;
  const parts = brDate.split('/');
  if (parts.length !== 3) return brDate;
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

/**
 * Compara duas datas no formato dd/mm/aaaa para ordenação cronológica correta
 */
export const compareDatesBR = (a: any, b: any): number => {
  if (!a || !b || typeof a !== 'string' || typeof b !== 'string') return 0;
  if (!a.includes('/') || !b.includes('/')) return 0;

  try {
    const [dayA, monthA, yearA] = a.split('/').map(Number);
    const [dayB, monthB, yearB] = b.split('/').map(Number);

    if (isNaN(dayA) || isNaN(dayB)) return 0;

    const dateA = new Date(yearA, monthA - 1, dayA).getTime();
    const dateB = new Date(yearB, monthB - 1, dayB).getTime();

    if (isNaN(dateA) || isNaN(dateB)) return 0;
    return dateA - dateB;
  } catch (e) {
    return 0;
  }
};

/**
 * Retorna a diferença em dias entre uma data (dd/mm/aaaa) e o dia atual
 */
export const getDaysDifference = (dateStr: string): number => {
  if (!dateStr) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [day, month, year] = dateStr.split('/').map(Number);
  const targetDate = new Date(year, month - 1, day);
  targetDate.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};
