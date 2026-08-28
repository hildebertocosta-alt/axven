"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../../components/dashboard/AppShell";

type Cliente = {
  id: string;
  nome: string;
  honorarios: number | null;
  status_pagamento: string;
  score: number | null;
  data_fim_contrato: string | null;
};

type Financeiro = {
  id: string;
  cliente_id: string;
  valor: number;
  status: string;
};

type Tarefa = {
  id: string;
  titulo: string;
  prioridade: string;
  concluido: boolean;
  cliente_nome?: string | null;
};

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
}

function Metric({ label, value, detail, tone = "neutral" }: { label: string; value: string; detail?: string; tone?: "neutral" | "gold" | "good" | "warn" }) {
  const tones = {
    neutral: "border-white/10 bg-zinc-950/80",
    gold: "border-[#D85A30]/30 bg-[#D85A30]/10",
    good: "border-emerald-500/20 bg-emerald-500/[0.06]",
    warn: "border-amber-500/25 bg-amber-500/[0.07]",
  };
  return (
    <div className={`rounded-3xl border p-5 ${tones[tone]}`}>
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p>
      {detail ? <p className="mt-2 text-xs text-zinc-500">{detail}</p> : null}
    </div>
  );
}

export default function ExecutiveDashboardPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [financeiro, setFinanceiro] = useState<Financeiro[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/dashboard/data", { cache: "no-store" });
      const data = await response.json();
      setClientes((data.clientes ?? []).map((item: Cliente) => ({ ...item, honorarios: item.honorarios == null ? null : Number(item.honorarios) })));
      setFinanceiro((data.financeiro ?? []).map((item: Financeiro) => ({ ...item, valor: Number(item.valor ?? 0) })));
      setTarefas(data.tarefas ?? []);
      setUpdatedAt(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const ativos = useMemo(() => clientes.filter((c) => c.status_pagamento !== "cancelado"), [clientes]);
  const mrr = useMemo(() => ativos.reduce((sum, c) => sum + Number(c.honorarios ?? 0), 0), [ativos]);
  const recebido = useMemo(() => financeiro.filter((f) => f.status === "pago").reduce((sum, f) => sum + f.valor, 0), [financeiro]);
  const emAberto = useMemo(() => financeiro.filter((f) => f.status !== "pago").reduce((sum, f) => sum + f.valor, 0), [financeiro]);
  const pendentes = useMemo(() => tarefas.filter((t) => !t.concluido), [tarefas]);
  const criticas = useMemo(() => pendentes.filter((t) => ["urgente", "alta"].includes(t.prioridade)), [pendentes]);
  const clientesAtencao = useMemo(() => ativos.filter((c) => c.status_pagamento === "atrasado" || (c.score != null && c.score < 60)), [ativos]);

  return (
    <AppShell
      title="Dashboard Executivo"
      subtitle="Comando geral da operação Axven"
      activeLabel="Dashboard"
      sidebarStatus={{ lastUpdated: updatedAt }}
      actions={<button onClick={() => void load()} disabled={loading} className="rounded-2xl border border-[#D85A30]/30 bg-[#D85A30]/10 px-4 py-2 text-sm font-medium text-[#f0a480] disabled:opacity-50">{loading ? "Atualizando..." : "↻ Atualizar"}</button>}
    >
      <div className="space-y-6">
        <section className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-gradient-to-br from-zinc-950 via-zinc-950 to-[#D85A30]/[0.07] p-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D85A30]">Axven Executive OS</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Visão executiva da agência</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">Receita, clientes e prioridades operacionais em uma única leitura.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/clientes" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 transition hover:bg-white/10">Clientes</Link>
            <Link href="/financeiro" className="rounded-xl border border-[#D85A30]/30 bg-[#D85A30]/10 px-4 py-2 text-sm text-[#f0a480] transition hover:bg-[#D85A30]/15">Financeiro</Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="MRR ativo" value={money(mrr)} detail={`${ativos.length} clientes ativos`} tone="gold" />
          <Metric label="Recebido" value={money(recebido)} detail="Registros financeiros pagos" tone="good" />
          <Metric label="Em aberto" value={money(emAberto)} detail="Registros ainda não pagos" tone={emAberto > 0 ? "warn" : "neutral"} />
          <Metric label="Clientes" value={String(ativos.length)} detail={`${clientesAtencao.length} exigindo atenção`} tone={clientesAtencao.length ? "warn" : "neutral"} />
          <Metric label="Tarefas" value={String(pendentes.length)} detail={`${criticas.length} de alta prioridade`} tone={criticas.length ? "warn" : "neutral"} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Prioridade</p><h3 className="mt-1 text-lg font-semibold text-white">O que exige atenção</h3></div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-400">{clientesAtencao.length + criticas.length} sinais</span>
            </div>
            <div className="mt-5 space-y-3">
              {clientesAtencao.map((cliente) => (
                <Link key={cliente.id} href={`/clientes/${cliente.id}`} className="flex items-center justify-between rounded-2xl border border-amber-500/15 bg-amber-500/[0.05] px-4 py-3 transition hover:border-amber-500/30">
                  <div><p className="text-sm font-medium text-white">{cliente.nome}</p><p className="mt-1 text-xs text-zinc-500">{cliente.status_pagamento === "atrasado" ? "Financeiro em atraso" : `Score ${cliente.score ?? "—"}`}</p></div>
                  <span className="text-sm text-amber-300">Abrir 360º →</span>
                </Link>
              ))}
              {criticas.slice(0, 5).map((tarefa) => (
                <div key={tarefa.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div><p className="text-sm font-medium text-white">{tarefa.titulo}</p><p className="mt-1 text-xs text-zinc-500">{tarefa.cliente_nome || "Operação interna"}</p></div>
                  <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-200">{tarefa.prioridade}</span>
                </div>
              ))}
              {!loading && clientesAtencao.length === 0 && criticas.length === 0 ? <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.05] p-5 text-sm text-emerald-200">Nenhum alerta crítico neste momento.</div> : null}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6">
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Acesso rápido</p>
            <h3 className="mt-1 text-lg font-semibold text-white">Operação</h3>
            <div className="mt-5 grid gap-3">
              {[
                ["Clientes 360º", "/clientes", "Gestão individual e saúde da carteira"],
                ["Financeiro", "/financeiro", "Receitas, cobranças e despesas"],
                ["Criativos", "/criativos", "Performance dos anúncios"],
                ["CRM", "/pipeline", "Pipeline e oportunidades"],
                ["Agenda", "/dashboard/agenda", "Compromissos e reuniões"],
              ].map(([label, href, detail]) => (
                <Link key={href} href={href} className="group rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-[#D85A30]/30 hover:bg-[#D85A30]/[0.05]">
                  <div className="flex items-center justify-between"><span className="text-sm font-medium text-white">{label}</span><span className="text-zinc-600 transition group-hover:text-[#D85A30]">→</span></div>
                  <p className="mt-1 text-xs text-zinc-500">{detail}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
