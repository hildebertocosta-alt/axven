"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../components/dashboard/AppShell";
import { supabase } from "../lib/supabase";

type FinanceStatus = "Pago" | "Atrasado" | "Vence hoje" | "Vence em breve" | "Pendente";

type PaymentItem = {
  id: string;
  client: string;
  value: number;
  dueDay: number;
  paid: boolean;
  status: FinanceStatus;
};

type FinanceRow = {
  id: string;
  cliente_id: string;
  valor: number;
  dia_vencimento: number;
  status: string;
  mes_referencia: string;
};

type ClienteRow = {
  id: string;
  nome: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function getFinanceStatus(dueDay: number, paid: boolean): FinanceStatus {
  if (paid) return "Pago";
  const today = new Date().getDate();
  if (today > dueDay) return "Atrasado";
  if (today === dueDay) return "Vence hoje";
  if (dueDay - today <= 3) return "Vence em breve";
  return "Pendente";
}

function getStatusClass(status: FinanceStatus) {
  switch (status) {
    case "Pago":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-200";
    case "Atrasado":
      return "border-rose-500/20 bg-rose-500/10 text-rose-200";
    case "Vence hoje":
      return "border-amber-500/20 bg-amber-500/10 text-amber-200";
    case "Vence em breve":
      return "border-orange-500/20 bg-orange-500/10 text-orange-200";
    default:
      return "border-zinc-500/20 bg-zinc-500/10 text-zinc-200";
  }
}

export default function FinanceiroPage() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);

  useEffect(() => {
    const loadPayments = async () => {
      const [{ data: financeiro }, { data: clientes }] = await Promise.all([
        supabase.from("financeiro").select("*").order("dia_vencimento"),
        supabase.from("clientes").select("id,nome"),
      ]);

      const clientMap = new Map((clientes ?? []).map((item: ClienteRow) => [item.id, item.nome]));
      const items = (financeiro ?? []).map((entry: FinanceRow) => {
        const paid = entry.status === "pago";
        return {
          id: entry.id,
          client: clientMap.get(entry.cliente_id) ?? "Cliente sem nome",
          value: Number(entry.valor ?? 0),
          dueDay: entry.dia_vencimento ?? 0,
          paid,
          status: getFinanceStatus(entry.dia_vencimento ?? 0, paid),
        };
      });

      setPayments(items);
    };

    loadPayments();
  }, []);

  const summary = useMemo(() => {
    const toReceive = payments.reduce((sum, item) => sum + (item.paid ? 0 : item.value), 0);
    const received = payments.reduce((sum, item) => sum + (item.paid ? item.value : 0), 0);
    const overdue = payments.reduce((sum, item) => sum + (item.status === "Atrasado" ? item.value : 0), 0);
    return { toReceive, received, overdue };
  }, [payments]);

  const markPaid = async (id: string) => {
    const { data } = await supabase.from("financeiro").update({ status: "pago" }).eq("id", id).select("*").single();
    if (!data) return;
    setPayments((current) =>
      current.map((item) => (item.id === id ? { ...item, paid: true, status: "Pago" } : item)),
    );
  };

  return (
    <AppShell title="Financeiro · Recebimentos" subtitle="Controle de cobranças e recebimentos" activeLabel="Financeiro">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-5">
            <p className="text-sm text-zinc-400">A receber este mês</p>
            <p className="mt-3 text-3xl font-semibold text-white">{formatCurrency(summary.toReceive)}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-5">
            <p className="text-sm text-zinc-400">Recebido</p>
            <p className="mt-3 text-3xl font-semibold text-white">{formatCurrency(summary.received)}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-5">
            <p className="text-sm text-zinc-400">Em atraso</p>
            <p className="mt-3 text-3xl font-semibold text-white">{formatCurrency(summary.overdue)}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Clientes</h3>
              <p className="mt-1 text-sm text-zinc-400">Status calculado automaticamente com base no dia atual.</p>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-white/5 text-left text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Valor mensal</th>
                  <th className="px-4 py-3 font-medium">Dia de vencimento</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-zinc-950/60 text-zinc-200">
                {payments.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-medium text-white">{item.client}</td>
                    <td className="px-4 py-3">{formatCurrency(item.value)}</td>
                    <td className="px-4 py-3">{item.dueDay}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusClass(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {item.paid ? (
                        <span className="text-sm text-emerald-300">Pago</span>
                      ) : (
                        <button
                          onClick={() => markPaid(item.id)}
                          className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
                        >
                          Marcar como pago
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
