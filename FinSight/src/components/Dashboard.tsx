"use client";

import { useMemo } from "react";
import {
  Area, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { ArrowDownCircle, ArrowUpCircle, BarChart3, Flame, Upload, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeMetrics } from "@/lib/dataParser";
import { cn, formatBRL, formatDateBR } from "@/lib/utils";
import type { Transaction } from "@/types/finance";

const PIE_COLORS = ["#1e3a5f", "#2563eb", "#0ea5e9", "#64748b", "#94a3b8", "#7c3aed", "#0d9488", "#cbd5e1"];

interface KpiProps {
  title: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  accent: string;
}

function Kpi({ title, value, sub, icon, accent }: KpiProps) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div className="min-w-0">
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-1 truncate text-2xl font-bold text-navy-800">{value}</p>
          {sub && <p className="mt-1 truncate text-xs text-slate-400">{sub}</p>}
        </div>
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", accent)}>{icon}</div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard({ transactions, onReset }: { transactions: Transaction[]; onReset: () => void }) {
  const m = useMemo(() => computeMetrics(transactions), [transactions]);
  const unit = m.granularity === "month" ? "mês" : "dia";

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-navy-900 text-white shadow-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold">FinSight Analytics</h1>
          </div>
          <Button variant="outline" onClick={onReset}>
            <Upload className="h-4 w-4" /> Carregar nova planilha
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        {/* KPIs */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi
            title="Saldo atual"
            value={formatBRL(m.balance)}
            icon={<Wallet className="h-5 w-5 text-navy-600" />}
            accent="bg-navy-50"
          />
          <Kpi
            title="Receitas"
            value={formatBRL(m.totalIncome)}
            icon={<ArrowUpCircle className="h-5 w-5 text-income" />}
            accent="bg-green-50"
          />
          <Kpi
            title="Despesas"
            value={formatBRL(m.totalExpense)}
            icon={<ArrowDownCircle className="h-5 w-5 text-expense" />}
            accent="bg-red-50"
          />
          <Kpi
            title="Maior gasto do mês"
            value={m.biggestExpense ? formatBRL(m.biggestExpense.amount) : "—"}
            sub={m.biggestExpense ? `${m.biggestExpense.description} · ${m.biggestExpenseMonth}` : undefined}
            icon={<Flame className="h-5 w-5 text-orange-500" />}
            accent="bg-orange-50"
          />
        </section>

        {/* Gráficos */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Receitas vs. Despesas</CardTitle>
              {m.forecastNext !== null && (
                <p className="text-xs text-slate-500">
                  Previsão de despesas para o próximo {unit}:{" "}
                  <span className="font-semibold text-expense">{formatBRL(m.forecastNext)}</span>
                </p>
              )}
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={m.timeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#dc2626" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#64748b" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatBRL(v)} />
                  <Legend />
                  <Area type="monotone" dataKey="receitas" name="Receitas" stroke="#16a34a" strokeWidth={2} fill="url(#gInc)" animationDuration={900} />
                  <Area type="monotone" dataKey="despesas" name="Despesas" stroke="#dc2626" strokeWidth={2} fill="url(#gExp)" animationDuration={900} />
                  <Line type="monotone" dataKey="previsao" name="Previsão de despesas" stroke="#dc2626" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3 }} animationDuration={1200} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Despesas por categoria</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={m.byCategory} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2} animationDuration={900}>
                    {m.byCategory.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatBRL(v)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </section>

        {/* Tabela */}
        <Card>
          <CardHeader>
            <CardTitle>Últimas 10 transações</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                  <th className="py-2 pr-4">Data</th>
                  <th className="py-2 pr-4">Descrição</th>
                  <th className="py-2 pr-4">Categoria</th>
                  <th className="py-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {m.recent.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="py-3 pr-4 text-slate-600">{formatDateBR(t.date)}</td>
                    <td className="py-3 pr-4 font-medium text-navy-800">{t.description}</td>
                    <td className="py-3 pr-4">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{t.category}</span>
                    </td>
                    <td className={cn("py-3 text-right font-semibold", t.type === "Receita" ? "text-income" : "text-expense")}>
                      {t.type === "Receita" ? "+" : "−"} {formatBRL(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
