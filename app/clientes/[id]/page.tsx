"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "../../components/dashboard/AppShell";

type Cliente = Record<string, unknown> & { id: string; nome: string; nicho?: string | null; honorarios?: number | null; status_pagamento?: string | null; score?: number | null; data_fim_contrato?: string | null };
type Financeiro = { id: string; valor?: number | null; status?: string | null; mes_referencia?: string | null; dia_vencimento?: number | null };
type Tarefa = { id: string; titulo?: string | null; prioridade?: string | null; concluido?: boolean | null };

const money = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
const text = (v: unknown) => typeof v === "string" && v.trim() ? v : "—";

export default function Cliente360Page() {
  const params = useParams<{ id: string }>();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [financeiro, setFinanceiro] = useState<Financeiro[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(`/api/clientes/360?id=${encodeURIComponent(params.id)}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Falha ao carregar cliente");
        setCliente(data.cliente);
        setFinanceiro(data.financeiro ?? []);
        setTarefas(data.tarefas ?? []);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao carregar cliente");
      } finally { setLoading(false); }
    })();
  }, [params.id]);

  if (loading) return <AppShell title="Cliente 360º" subtitle="Central operacional do cliente" activeLabel="Clientes"><div className="p-10 text-zinc-500">Carregando cliente...</div></AppShell>;
  if (erro || !cliente) return <AppShell title="Cliente 360º" subtitle="Central operacional do cliente" activeLabel="Clientes"><div className="p-10"><Link href="/clientes" className="text-[#d7b66f]">← Voltar para clientes</Link><p className="mt-6 text-rose-400">{erro || "Cliente não encontrado"}</p></div></AppShell>;

  const pendentes = tarefas.filter((t) => !t.concluido);
  const ultimoFinanceiro = financeiro[0];
  const tabs = ["Visão geral", "Campanhas", "Leads", "Criativos", "Automações", "Financeiro", "Tarefas", "Documentos", "Histórico"];

  return (
    <AppShell title={cliente.nome} subtitle="Cliente 360º · Central operacional" activeLabel="Clientes">
      <div className="mx-auto max-w-[1500px] space-y-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <Link href="/clientes" className="text-xs text-zinc-500 transition hover:text-[#d7b66f]">← Carteira de clientes</Link>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-[#caa45c]">Axven · Cliente 360º</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-100">{cliente.nome}</h2>
            <p className="mt-2 text-sm text-zinc-500">{text(cliente.nicho)} · Carteira ativa</p>
          </div>
          <div className="flex gap-2"><span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300">● Ativo</span><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-400">Financeiro: {text(cliente.status_pagamento).replaceAll("_", " ")}</span></div>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-white/[0.07] pb-px">{tabs.map((tab, i) => <button key={tab} className={`whitespace-nowrap border-b-2 px-4 py-3 text-xs font-medium ${i === 0 ? "border-[#caa45c] text-[#d7b66f]" : "border-transparent text-zinc-600"}`}>{tab}</button>)}</div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Honorários", cliente.honorarios != null ? money(Number(cliente.honorarios)) : "—", "Mensalidade contratada"],
            ["Score", cliente.score != null ? String(cliente.score) : "—", "Saúde da conta"],
            ["Tarefas abertas", String(pendentes.length), pendentes.length ? "Pendências operacionais" : "Nenhuma pendência"],
            ["Contrato", cliente.data_fim_contrato ? new Date(`${cliente.data_fim_contrato}T12:00:00`).toLocaleDateString("pt-BR") : "—", "Data de encerramento"],
          ].map(([label, value, detail]) => <div key={label} className="rounded-2xl border border-white/[0.07] bg-[#111316] p-5"><p className="text-[11px] uppercase tracking-[0.14em] text-zinc-600">{label}</p><p className="mt-3 text-2xl font-semibold text-zinc-100">{value}</p><p className="mt-2 text-xs text-zinc-600">{detail}</p></div>)}
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
          <div className="rounded-2xl border border-white/[0.07] bg-[#111316] p-6">
            <div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.15em] text-zinc-600">Operação</p><h3 className="mt-2 text-lg font-semibold">Resumo executivo</h3></div><span className="text-xs text-zinc-600">Dados reais disponíveis</span></div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[['Nicho', cliente.nicho], ['Telefone', cliente.telefone], ['Canal', cliente.canal], ['Conta Meta', cliente.meta_ad_account_id]].map(([k,v]) => <div key={String(k)} className="rounded-xl border border-white/[0.06] bg-[#0c0e10] p-4"><p className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">{String(k)}</p><p className="mt-2 text-sm text-zinc-300">{text(v)}</p></div>)}
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#111316] p-6">
            <p className="text-xs uppercase tracking-[0.15em] text-zinc-600">Financeiro</p><h3 className="mt-2 text-lg font-semibold">Situação atual</h3>
            <div className="mt-6"><p className="text-sm text-zinc-500">Último registro</p><p className="mt-2 text-2xl font-semibold">{ultimoFinanceiro?.valor != null ? money(Number(ultimoFinanceiro.valor)) : "—"}</p><p className="mt-2 text-xs text-zinc-600">{ultimoFinanceiro ? `${text(ultimoFinanceiro.mes_referencia)} · ${text(ultimoFinanceiro.status)}` : "Sem registro financeiro disponível"}</p></div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/[0.07] bg-[#111316] p-6">
          <div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.15em] text-zinc-600">Prioridades</p><h3 className="mt-2 text-lg font-semibold">Tarefas abertas</h3></div><span className="text-sm text-[#d7b66f]">{pendentes.length}</span></div>
          <div className="mt-5 divide-y divide-white/[0.06]">{pendentes.slice(0, 6).map((t) => <div key={t.id} className="flex items-center justify-between py-4"><span className="text-sm text-zinc-300">{text(t.titulo)}</span><span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase text-zinc-500">{text(t.prioridade)}</span></div>)}{pendentes.length === 0 && <p className="py-6 text-sm text-zinc-600">Nenhuma tarefa aberta para este cliente.</p>}</div>
        </section>
      </div>
    </AppShell>
  );
}
