export type TransactionType = "Receita" | "Despesa";

export interface Transaction {
  id: number;
  date: string; // ISO yyyy-mm-dd
  description: string;
  category: string;
  type: TransactionType;
  amount: number; // sempre positivo
}

export interface CategoryTotal {
  name: string;
  value: number;
}

export interface TimePoint {
  key: string; // yyyy-mm ou yyyy-mm-dd
  label: string;
  receitas: number | null;\n  despesas: number | null;\n  previsao?: number; // projeção de despesas
}

export interface Metrics {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  biggestExpense: Transaction | null; // maior gasto do mês mais recente
  biggestExpenseMonth: string;
  byCategory: CategoryTotal[];
  timeline: TimePoint[];
  granularity: "month" | "day";
  forecastNext: number | null;
  recent: Transaction[];
}
