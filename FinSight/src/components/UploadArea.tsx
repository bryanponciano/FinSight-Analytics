"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloud, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { parseFile } from "@/lib/dataParser";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/types/finance";

type Status = { kind: "idle" } | { kind: "loading" } | { kind: "success"; name: string; count: number } | { kind: "error"; message: string };

const ACCEPTED = [".csv", ".xlsx", ".xls"];

export default function UploadArea({ onData }: { onData: (t: Transaction[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const handleFile = useCallback(
    async (file?: File) => {
      if (!file) return;
      const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
      if (!ACCEPTED.includes(ext)) {
        setStatus({ kind: "error", message: "Arquivo inválido. Use .csv ou .xlsx." });
        return;
      }
      setStatus({ kind: "loading" });
      try {
        const data = await parseFile(file);
        setStatus({ kind: "success", name: file.name, count: data.length });
        setTimeout(() => onData(data), 700); // deixa o feedback visível
      } catch (e) {
        setStatus({ kind: "error", message: e instanceof Error ? e.message : "Erro ao processar o arquivo." });
      }
    },
    [onData]
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFile(e.dataTransfer.files?.[0]);
      }}
      className={cn(
        "cursor-pointer rounded-2xl border-2 border-dashed bg-white p-10 text-center shadow-xl transition-all",
        dragging ? "scale-[1.02] border-navy-600 bg-slate-50" : "border-slate-300 hover:border-navy-600",
        status.kind === "error" && "border-expense",
        status.kind === "success" && "border-income"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {status.kind === "loading" && <Loader2 className="mx-auto h-12 w-12 animate-spin text-navy-600" />}
      {status.kind === "success" && <CheckCircle2 className="mx-auto h-12 w-12 text-income" />}
      {status.kind === "error" && <AlertCircle className="mx-auto h-12 w-12 text-expense" />}
      {(status.kind === "idle") && <UploadCloud className="mx-auto h-12 w-12 text-navy-600" />}

      <p className="mt-4 text-lg font-semibold text-navy-800">
        {status.kind === "success"
          ? `${status.count} transações carregadas!`
          : status.kind === "loading"
          ? "Processando planilha..."
          : "Arraste sua planilha aqui"}
      </p>
      <p className={cn("mt-1 text-sm", status.kind === "error" ? "text-expense" : "text-slate-500")}>
        {status.kind === "error"
          ? status.message
          : status.kind === "success"
          ? status.name
          : "ou clique para selecionar (.csv, .xlsx)"}
      </p>
      <p className="mt-4 text-xs text-slate-400">
        Colunas esperadas: Data, Descrição, Categoria, Tipo (Receita/Despesa) e Valor. Seus dados nunca saem do navegador.
      </p>
    </div>
  );
}
