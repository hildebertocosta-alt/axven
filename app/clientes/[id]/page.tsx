"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "../../components/dashboard/AppShell";

type Cliente = Record<string, unknown> & {
  id: string;
  nome: string;
  nicho?: string | null;
  honorarios?: number | null;
  status_pagamento?: string | null;
  score?: number | null;
  data_fim_contrato?: string | null;
  meta_account_id?: string | null;
};
type Financeiro = { id: string; valor?: number | null; status?: string | null; mes_referencia?: string | null; dia_vencimento?: number | null };
type Tarefa = { id: string; titulo?: string | null; prioridade?: string | null; concluido?: boolean | null };
type MetaConta = { account_id: string; name?: string | null; business_name?: string | null };

const money = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
const text = (v: unknown) => typeof v === "string" && v.trim() ? v : "—";

export default function Cliente360Page() {
  const params = useParams<{ id: string }>();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [financeiro, setFinanceiro] = useState<Financeiro[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("Visão geral");
  const [metaContas, setMetaContas] = useState<MetaConta[]>([]);
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaLoaded, setMetaLoaded] = useState(false);
  const [metaErro, setMetaErro] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);
  const [metaSuccess, setMetaSuccess] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(`/api/clientes/360?id=${encodeURIComponent(params.id)}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Falha ao carregar cliente");
        setCliente(data.cliente);
        setFinanceiro(data.financeiro ?? []);
        setTarefas(data.tarefas ?? []);
        setSelectedAccount(data.cliente?.meta_account_id ?? "");
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao carregar cliente");
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id]);

  async function carregarContasMeta() {
    if (metaLoaded || metaLoading) return;
    setMetaLoading(true);
    setMetaErro(null);
    try {
      const response = await fetch(`/api/clientes/meta?cliente_id=${encodeURIComponent(params.id)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha ao carregar contas Meta");
      setMetaContas(data.contas ?? []);
      setSelectedAccount(data.cliente?.meta_account_id ?? "");
      setMetaLoaded(true);
    } catch (e) {
      setMetaErro(e instanceof Error ? e.message : "Falha ao carregar contas Meta");
    } finally {
      setMetaLoading(false);
    }
  }

  async function abrirAba(tab: string) {
    setActiveTab(tab);
    if (tab === "Campanhas") await carregarContasMeta();
  }

  async function vincularContaMeta() {
    if (!selectedAccount) return;
    setSavingMeta(true);
    setMetaErro(null);
    setMetaSuccess(null);
    try {
      const response = await fetch("/api/clientes/meta", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cliente_id: params.id, account_id: selectedAccount }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha ao vincular conta Meta");
      setCliente((prev) => prev ? { ...prev, meta_account_id: data.cliente?.meta_account_id ?? selectedAccount } : prev);
      setMetaSuccess(`Conta ${data.conta?.name || selectedAccount} vinculada com sucesso.`);
    } catch (e) {
      setMetaErro(e instanceof Error ? e.message : "Falha ao vincular conta Meta");
    } finally {
      setSavingMeta(false);
    }
  }

  if (loading) return <AppShell title="Cliente 360º" subtitle="Central operacional do cliente" activeLabel="Clientes"><div className="p-10 text-zinc-500">Carregando cliente...</div></AppShell>;
  if (erro || !cliente) return <AppShell title="Cliente 360º" subtitle="Central operacional do cliente" activeLabel="Clientes"><div className="p-10"><Link href="/clientes" className="text-[#d7b66f]">← Voltar para clientes</Link><p className="mt-6 text-rose-400">{erro || "Cliente não encontrado"}</p></div></AppShell>;

  const pendentes = tarefas.filter((t) => !t.concluido);
  const ultimoFinanceiro = financeiro[0];
  const tabs = ["Visão geral", "Campanhas", "Leads", "Criativos", "Automações", "Financeiro", "Tarefas", "Documentos", "Histórico"];
  const contaVinculada = metaContas.find((c) => c.account_id === cliente.meta_account_id);

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

        <div className="flex gap-1 overflow-x-auto border-b border-white/[0.07] pb-px">
          {tabs.map((tab) => (
            <button key={tab} onClick={() => abrirAba(tab)} className={`whitespace-nowrap border-b-2 px-4 py-3 text-xs font-medium transition ${activeTab === tab ? "border-[#caa45c] text-[#d7b66f]" : "border-transparent text-zinc-600 hover:text-zinc-300"}`}>{tab}</button>
          ))}
        </div>

        {activeTab === "Visão geral" && (
          <>
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
                  {[["Nicho", cliente.nicho], ["Telefone", cliente.telefone], ["Canal", cliente.canal], ["Conta Meta", cliente.meta_account_id]].map(([k,v]) => <div key={String(k)} className="rounded-xl border border-white/[0.06] bg-[#0c0e10] p-4"><p className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">{String(k)}</p><p className="mt-2 text-sm text-zinc-300">{text(v)}</p></div>)}
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
          </>
        )}

        {activeTab === "Campanhas" && (
          <section className="grid gap-5 xl:grid-cols-[1fr_.8fr]">
            <div className="rounded-2xl border border-white/[0.07] bg-[#111316] p-6">
              <p className="text-xs uppercase tracking-[0.15em] text-zinc-600">Meta Ads</p>
              <h3 className="mt-2 text-xl font-semibold text-zinc-100">Vincular conta de anúncios</h3>
              <p className="mt-2 max-w-2xl text-sm text-zinc-500">Escolha a conta Meta correta deste cliente. Depois disso, a Axven poderá carregar as campanhas reais desta conta.</p>

              {metaLoading && <p className="mt-6 text-sm text-zinc-500">Carregando contas Meta...</p>}
              {metaErro && <p className="mt-6 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">{metaErro}</p>}
              {metaSuccess && <p className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">{metaSuccess}</p>}

              {!metaLoading && !metaErro && (
                <div className="mt-6 flex flex-col gap-3 md:flex-row">
                  <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} className="h-11 min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-[#0c0e10] px-4 text-sm text-zinc-300 outline-none focus:border-[#caa45c]/50">
                    <option value="">Selecione a conta de anúncios...</option>
                    {metaContas.map((conta) => <option key={conta.account_id} value={conta.account_id}>{(conta.name || conta.business_name || "Conta Meta")} · {conta.account_id}</option>)}
                  </select>
                  <button onClick={vincularContaMeta} disabled={!selectedAccount || savingMeta} className="h-11 rounded-xl bg-[#caa45c] px-5 text-sm font-semibold text-[#111214] transition hover:bg-[#dab76f] disabled:cursor-not-allowed disabled:opacity-40">{savingMeta ? "Vinculando..." : "Vincular conta"}</button>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-[#111316] p-6">
              <p className="text-xs uppercase tracking-[0.15em] text-zinc-600">Status da integração</p>
              <h3 className="mt-2 text-lg font-semibold">Campanhas</h3>
              {cliente.meta_account_id ? (
                <div className="mt-6">
                  <span className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">● Conta vinculada</span>
                  <p className="mt-4 text-sm font-medium text-zinc-300">{contaVinculada?.name || contaVinculada?.business_name || "Conta Meta"}</p>
                  <p className="mt-1 text-xs text-zinc-600">ID {cliente.meta_account_id}</p>
                  <p className="mt-5 text-sm text-zinc-500">A conta está pronta. O próximo bloco será a listagem das campanhas reais e suas métricas.</p>
                </div>
              ) : (
                <div className="mt-6 rounded-xl border border-amber-500/15 bg-amber-500/[0.06] p-4 text-sm text-amber-200/80">Nenhuma conta Meta vinculada a este cliente.</div>
              )}
            </div>
          </section>
        )}

        {activeTab !== "Visão geral" && activeTab !== "Campanhas" && (
          <section className="rounded-2xl border border-white/[0.07] bg-[#111316] p-10 text-center">
            <p className="text-xs uppercase tracking-[0.15em] text-[#caa45c]">{activeTab}</p>
            <h3 className="mt-3 text-lg font-semibold text-zinc-200">Módulo em construção</h3>
            <p className="mt-2 text-sm text-zinc-600">Esta área será conectada aos dados reais na próxima etapa.</p>
          </section>
        )}
      </div>
    </AppShell>
  );
}
