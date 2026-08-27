"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../components/dashboard/AppShell";
import { supabase } from "../lib/supabase";

type Cliente = {
  id: string;
  nome: string;
  nicho: string | null;
  score: number | null;
  status: string | null;
  status_pagamento: string | null;
  honorarios: number | null;
  data_fim_contrato: string | null;
};

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
}

function statusLabel(status: string | null) {
  if (status === "ativo") return "Ativo";
  if (status === "pausado") return "Pausado";
  if (status === "cancelado") return "Cancelado";
  return status || "Não informado";
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");

  useEffect(() => {
    let mounted = true;
    async function carregar() {
      setLoading(true);
      const { data } = await supabase
        .from("clientes")
        .select("id,nome,nicho,score,status,status_pagamento,honorarios,data_fim_contrato")
        .order("nome");
      if (mounted) {
        setClientes((data as Cliente[]) || []);
        setLoading(false);
      }
    }
    carregar();
    return () => { mounted = false; };
  }, []);

  const filtrados = useMemo(() => clientes.filter((c) => {
    const texto = `${c.nome} ${c.nicho || ""}`.toLowerCase();
    const buscaOk = texto.includes(busca.toLowerCase());
    const filtroOk = filtro === "todos" || c.status === filtro;
    return buscaOk && filtroOk;
  }), [clientes, busca, filtro]);

  const ativos = clientes.filter((c) => c.status === "ativo").length;
  const receita = clientes.filter((c) => c.status === "ativo").reduce((s, c) => s + Number(c.honorarios || 0), 0);
  const atrasados = clientes.filter((c) => c.status_pagamento === "atrasado").length;

  return (
    <AppShell>
      <main className="min-h-screen bg-[#0b0c0e] text-zinc-100">
        <div className="mx-auto max-w-[1500px] px-6 py-8 lg:px-10">
          <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#caa45c]">Axven Executive OS</p>
              <h1 className="text-3xl font-semibold tracking-tight">Clientes</h1>
              <p className="mt-2 text-sm text-zinc-500">Central operacional dos clientes da Axven.</p>
            </div>
            <Link href="/dashboard?novo_cliente=1" className="inline-flex h-11 items-center justify-center rounded-xl bg-[#caa45c] px-5 text-sm font-semibold text-[#111214] transition hover:bg-[#dab76f]">+ Novo cliente</Link>
          </header>

          <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Clientes ativos", String(ativos), "Carteira atual"],
              ["Receita contratada", money(receita), "Honorários ativos"],
              ["Pagamentos atrasados", String(atrasados), atrasados ? "Requer atenção" : "Tudo em dia"],
              ["Clientes cadastrados", String(clientes.length), "Base total"],
            ].map(([label, value, detail]) => (
              <div key={label} className="rounded-2xl border border-white/[0.07] bg-[#111316] p-5 shadow-[0_18px_50px_rgba(0,0,0,.18)]">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">{label}</p>
                <p className="mt-3 text-2xl font-semibold tracking-tight text-zinc-100">{loading ? "—" : value}</p>
                <p className="mt-2 text-xs text-zinc-600">{detail}</p>
              </div>
            ))}
          </section>

          <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#111316]">
            <div className="flex flex-col gap-3 border-b border-white/[0.06] p-4 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-md">
                <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cliente ou nicho..." className="h-11 w-full rounded-xl border border-white/[0.08] bg-[#0c0e10] px-4 text-sm outline-none placeholder:text-zinc-700 focus:border-[#caa45c]/50" />
              </div>
              <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="h-11 rounded-xl border border-white/[0.08] bg-[#0c0e10] px-4 text-sm text-zinc-300 outline-none">
                <option value="todos">Todos os status</option>
                <option value="ativo">Ativos</option>
                <option value="pausado">Pausados</option>
                <option value="cancelado">Cancelados</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-white/[0.06] text-[11px] uppercase tracking-[0.13em] text-zinc-600">
                  <tr><th className="px-5 py-4 font-medium">Cliente</th><th className="px-5 py-4 font-medium">Status</th><th className="px-5 py-4 font-medium">Honorários</th><th className="px-5 py-4 font-medium">Financeiro</th><th className="px-5 py-4 font-medium">Score</th><th className="px-5 py-4 font-medium">Contrato</th><th className="px-5 py-4"></th></tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {!loading && filtrados.map((c) => (
                    <tr key={c.id} className="group transition hover:bg-white/[0.025]">
                      <td className="px-5 py-4"><div className="font-medium text-zinc-200">{c.nome}</div><div className="mt-1 text-xs text-zinc-600">{c.nicho || "Nicho não informado"}</div></td>
                      <td className="px-5 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${c.status === "ativo" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-white/10 bg-white/5 text-zinc-400"}`}>{statusLabel(c.status)}</span></td>
                      <td className="px-5 py-4 text-zinc-300">{c.honorarios != null ? money(Number(c.honorarios)) : "—"}</td>
                      <td className="px-5 py-4"><span className={c.status_pagamento === "atrasado" ? "text-rose-400" : "text-zinc-400"}>{c.status_pagamento ? c.status_pagamento.replaceAll("_", " ") : "—"}</span></td>
                      <td className="px-5 py-4"><span className="font-medium text-[#d7b66f]">{c.score ?? "—"}</span></td>
                      <td className="px-5 py-4 text-zinc-500">{c.data_fim_contrato ? new Date(`${c.data_fim_contrato}T12:00:00`).toLocaleDateString("pt-BR") : "—"}</td>
                      <td className="px-5 py-4 text-right"><Link href={`/clientes/${c.id}`} className="rounded-lg border border-white/[0.08] px-3 py-2 text-xs font-medium text-zinc-400 transition hover:border-[#caa45c]/30 hover:text-[#d7b66f]">Abrir 360º →</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {loading && <div className="p-10 text-center text-sm text-zinc-600">Carregando clientes...</div>}
            {!loading && filtrados.length === 0 && <div className="p-10 text-center text-sm text-zinc-600">Nenhum cliente encontrado.</div>}
          </section>
        </div>
      </main>
    </AppShell>
  );
}
