"use client";

import { useState } from "react";
import { BarChart3 } from "lucide-react";
import UploadArea from "@/components/UploadArea";
import Dashboard from "@/components/Dashboard";
import type { Transaction } from "@/types/finance";

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);

  if (transactions) {
    return <Dashboard transactions={transactions} onReset={() => setTransactions(null)} />;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-navy-900 to-navy-700 flex flex-col items-center justify-center p-6">
      <div className="mb-8 text-center text-white">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
          <BarChart3 className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-bold">FinSight Analytics</h1>
        <p className="mt-2 text-slate-300">Suba sua planilha e veja seus números ganharem vida. 100% no seu navegador.</p>
      </div>
      <div className="w-full max-w-xl">
        <UploadArea onData={setTransactions} />
      </div>
    </main>
  );
}
