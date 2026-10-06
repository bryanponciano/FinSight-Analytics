import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { Metrics, TimePoint, Transaction, TransactionType } from "@/types/finance";

/* ------------------------------------------------------------------ */
/* 1. Leitura de arquivo (client-side)                                 */
/* ------------------------------------------------------------------ */

type RawRow = Record<string, unknown>;

export async function parseFile(file: File): Promise<Transaction[]> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  let rows: RawRow[];

  if (ext === "csv") {
    rows = await new Promise<RawRow[]>((resolve, reject) =>
      Papa.parse<RawRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (r) => resolve(r.data),
        error: reject,
      })
    );
  } else if (ext === "xlsx" || ext === "xls") {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array", cellDates: true });
    rows = XLSX.utils.sheet_to_json<RawRow>(wb.Sheets[wb.SheetNames[0]], { defval: "" });
  } else {
    throw new Error("Formato inválido. Envie um arquivo .csv ou .xlsx.");
  }

  return normalizeRows(rows);
}

/* ------------------------------------------------------------------ */
/* 2. Normalização                                                     */
/* ------------------------------------------------------------------ */

const ALIASES: Record<string, string[]> = {
  date: ["data", "date", "dia", "datadatransacao", "datalancamento"],
  description: ["descricao", "description", "historico", "memo", "detalhe", "nome"],
  category: ["categoria", "category", "grupo", "classificacao"],
  type: ["tipo", "type", "natureza", "operacao"],
  amount: ["valor", "value", "amount", "montante", "quantia"],
};

const strip = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

function mapColumns(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [field, names] of Object.entries(ALIASES)) {
    const found = headers.find((h) => names.includes(strip(h)));
    if (found) map[field] = found;
  }
  return map;
}

export function parseAmount(v: unknown): number {
  if (typeof v === "number") return v;
  let s = String(v ?? "").trim().replace(/[R$\s]/g, "");
  if (!s) return NaN;
  const negative = /^\(.*\)$/.test(s) || s.startsWith("-");
  s = s.replace(/[()-]/g, "");
  // pt-BR "1.234,56" vs en "1,234.56"
  if (s.includes(",") && s.includes(".")) {
    s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }
  const n = parseFloat(s);
  return negative ? -n : n;
}

const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function parseDate(v: unknown): string | null {
  if (v instanceof Date && !isNaN(v.getTime())) return toISO(v);
  if (typeof v === "number") {
    // serial do Excel
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? null : `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }
  const s = String(v ?? "").trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    return `${y}-${pad(+m[2])}-${pad(+m[1])}`; // dd/mm/yyyy (padrão BR)
  }
  return null;
}

function parseType(v: unknown, amount: number): TransactionType {
  const s = strip(String(v ?? ""));
  if (/^(receita|entrada|income|credito|credit|r)$/.test(s)) return "Receita";
  if (/^(despesa|saida|expense|debito|debit|gasto|d)$/.test(s)) return "Despesa";
  return amount < 0 ? "Despesa" : "Receita";
}

export function normalizeRows(rows: RawRow[]): Transaction[] {
  if (!rows.length) throw new Error("A planilha está vazia.");
  const cols = mapColumns(Object.keys(rows[0]));
  const missing = ["date", "amount"].filter((f) => !cols[f]);
  if (missing.length) {
    throw new Error("Colunas obrigatórias não encontradas: Data e Valor. Verifique o cabeçalho da planilha.");
  }

  const out: Transaction[] = [];
  rows.forEach((row, i) => {
    const date = parseDate(row[cols.date]);
    const raw = parseAmount(row[cols.amount]);
    if (!date || isNaN(raw)) return; // ignora linhas inválidas
    out.push({
      id: i,
      date,
      description: String(row[cols.description] ?? "").trim() || "Sem descrição",
      category: String(row[cols.category] ?? "").trim() || "Outros",
      type: parseType(row[cols.type], raw),
      amount: Math.abs(raw),
    });
  });

  if (!out.length) throw new Error("Nenhuma transação válida encontrada na planilha.");
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

/* ------------------------------------------------------------------ */
/* 3. Previsão (regressão linear simples)                              */
/* ------------------------------------------------------------------ */

export function linearForecast(values: number[]): number | null {
  const n = values.length;
  if (n < 2) return null;
  const xs = values.map((_, i) => i);
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = values.reduce((a, b) => a + b, 0) / n;
  const den = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  const slope = xs.reduce((a, x, i) => a + (x - mx) * (values[i] - my), 0) / den;
  const intercept = my - slope * mx;
  return Math.max(0, intercept + slope * n);
}

/* ------------------------------------------------------------------ */
/* 4. Métricas                                                         */
/* ------------------------------------------------------------------ */

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function nextKey(key: string, granularity: "month" | "day"): string {
  const [y, m, d] = key.split("-").map(Number);
  if (granularity === "month") return m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`;
  const dt = new Date(y, m - 1, d + 1);
  return toISO(dt);
}

function labelFor(key: string, granularity: "month" | "day"): string {
  const [y, m, d] = key.split("-");
  return granularity === "month" ? `${MONTHS[+m - 1]}/${y.slice(2)}` : `${d}/${m}`;
}

export function computeMetrics(transactions: Transaction[]): Metrics {
  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date));
  const incomes = sorted.filter((t) => t.type === "Receita");
  const expenses = sorted.filter((t) => t.type === "Despesa");

  const totalIncome = incomes.reduce((s, t) => s + t.amount, 0);
  const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);

  // Categorias (despesas)
  const catMap = new Map<string, number>();
  expenses.forEach((t) => catMap.set(t.category, (catMap.get(t.category) ?? 0) + t.amount));
  const byCategory = [...catMap.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Granularidade: dias se o período for curto (<= 62 dias)
  const first = new Date(sorted[sorted.length - 1].date).getTime();
  const last = new Date(sorted[0].date).getTime();
  const granularity: "month" | "day" = (last - first) / 86400000 <= 62 ? "day" : "month";
  const keyOf = (iso: string) => (granularity === "month" ? iso.slice(0, 7) : iso);

  const buckets = new Map<string, { receitas: number; despesas: number }>();
  transactions.forEach((t) => {
    const k = keyOf(t.date);
    const b = buckets.get(k) ?? { receitas: 0, despesas: 0 };
    if (t.type === "Receita") b.receitas += t.amount;
    else b.despesas += t.amount;
    buckets.set(k, b);
  });

  const timeline: TimePoint[] = [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => ({ key, label: labelFor(key, granularity), ...v }));

  // Previsão de despesas para o próximo período
  const forecastNext = linearForecast(timeline.map((p) => p => p.despesas ?? 0));
  if (forecastNext !== null && timeline.length) {
    const lastPoint = timeline[timeline.length - 1];
    lastPoint.previsao = lastPoint.despesas; // conecta a linha pontilhada
    const k = nextKey(lastPoint.key, granularity);
    timeline.push({ key: k, label: labelFor(k, granularity), receitas: null, despesas: null, previsao: forecastNext });
  }

  // Maior gasto do mês mais recente
  const latestMonth = sorted[0].date.slice(0, 7);
  const biggestExpense =
    expenses.filter((t) => t.date.startsWith(latestMonth)).sort((a, b) => b.amount - a.amount)[0] ?? null;

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    biggestExpense,
    biggestExpenseMonth: labelFor(latestMonth, "month"),
    byCategory,
    timeline,
    granularity,
    forecastNext,
    recent: sorted.slice(0, 10),
  };
}
