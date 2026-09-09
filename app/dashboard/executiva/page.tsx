import Link from "next/link";
import { AppShell } from "../../components/dashboard/AppShell";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STAGES = [
  ["lead", "Leads"],
  ["qualificado", "Qualificados"],
  ["agendado", "Agendados"],
  ["proposta_enviada", "Propostas"],
  ["fechado", "Fechados"],
] as const;

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
}

function pct(value: number) {
  return `${value.toFixed(1).replace(".", ",")}%`;
}

export default async function DashboardExecutivaPage() {
  const [{ data: leads, error: leadsError }, { data: clientes }, { data: financeiro }, { data: despesas }] = await Promise.all([
    supabaseAdmin
      .from("aquisicao_axven_leads")
      .select("etapa, qualificado, agendado_em, venda_em, valor_venda, moeda, utm_campaign, campaign_id, ad_id"),
    supabaseAdmin.from("clientes").select("id, status_pagamento, honorarios"),
    supabaseAdmin.from("financeiro").select("valor, status"),
    supabaseAdmin.from("despesas").select("valor"),
  ]);

  if (leadsError) throw new Error(`Falha ao carregar aquisição Axven: ${leadsError.message}`);

  const rows = leads ?? [];
  const stageCounts = Object.fromEntries(STAGES.map(([stage]) => [stage, rows.filter((lead) => lead.etapa === stage).length]));
  const totalLeads = rows.length;
  const qualificados = rows.filter((lead) => lead.qualificado).length;
  const agendados = rows.filter((lead) => Boolean(lead.agendado_em) || lead.etapa === "agendado").length;
  const fechados = rows.filter((lead) => lead.etapa === "fechado").length;
  const receitaNova = rows
    .filter((lead) => lead.etapa === "fechado" && (lead.moeda ?? "BRL") === "BRL")
    .reduce((sum, lead) => sum + Number(lead.valor_venda ?? 0), 0);

  const clientesAtivos = (clientes ?? []).filter((cliente) => cliente.status_pagamento !== "cancelado");
  const mrr = clientesAtivos.reduce((sum, cliente) => sum + Number(cliente.honorarios ?? 0), 0);
  const receitaRegistrada = (financeiro ?? []).reduce((sum, item) => sum + Number(item.valor ?? 0), 0);
  const despesasRegistradas = (despesas ?? []).reduce((sum, item) => sum + Number(item.valor ?? 0), 0);

  const taxaQualificacao = totalLeads ? (qualificados / totalLeads) * 100 : 0;
  const taxaAgendamento = qualificados ? (agendados / qualificados) * 100 : 0;
  const taxaFechamento = agendados ? (fechados / agendados) * 100 : 0;

  return (
    <AppShell title="Dashboard Executiva" subtitle="Axven Digital · visão geral da operação" activeLabel="Dashboard">
      <div className="space-y-6">
        <section>
          <p className="text-sm font-medium text-[#D85A30]">Visão Axven</p>
          <h2 className="mt-1 text-2xl font-semibold text-white">Como está a Axven hoje</h2>
          <p className="mt-1 text-sm text-zinc-400">Indicadores conectados às fontes reais da operação.</p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["MRR", money(mrr), "Honorários de clientes ativos"],
            ["Clientes ativos", String(clientesAtivos.length), "Operação atual"],
            ["Receita comercial nova", money(receitaNova), "Fechamentos no CRM Axven"],
            ["Margem registrada", money(receitaRegistrada - despesasRegistradas), "Financeiro menos despesas registradas"],
          ].map(([label, value, note]) => (
            <div key={label} className="rounded-3xl border border-white/10 bg-zinc-950/80 p-5">
              <p className="text-sm text-zinc-400">{label}</p>
              <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
              <p className="mt-2 text-xs text-zinc-500">{note}</p>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-[#D85A30]/25 bg-[#D85A30]/5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[#f0a480]">Aquisição própria</p>
              <h3 className="mt-1 text-xl font-semibold text-white">Funil Axven</h3>
            </div>
            <Link href="/pipeline" className="rounded-full border border-[#D85A30]/30 bg-[#D85A30]/10 px-4 py-2 text-sm font-medium text-[#f0a480]">Abrir CRM</Link>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {STAGES.map(([stage, label]) => (
              <div key={stage} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-white">{stageCounts[stage] ?? 0}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><p className="text-sm text-zinc-400">Qualificação</p><p className="mt-1 text-xl font-semibold text-white">{pct(taxaQualificacao)}</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><p className="text-sm text-zinc-400">Qualificado → agenda</p><p className="mt-1 text-xl font-semibold text-white">{pct(taxaAgendamento)}</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><p className="text-sm text-zinc-400">Agenda → fechamento</p><p className="mt-1 text-xl font-semibold text-white">{pct(taxaFechamento)}</p></div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Link href="/pipeline" className="rounded-3xl border border-white/10 bg-zinc-950/80 p-5 transition hover:border-[#D85A30]/40"><p className="text-sm text-zinc-400">Comercial</p><p className="mt-2 text-lg font-semibold text-white">Pipeline Axven</p><p className="mt-1 text-sm text-zinc-500">Leads, propostas, vendas e valores.</p></Link>
          <Link href="/financeiro" className="rounded-3xl border border-white/10 bg-zinc-950/80 p-5 transition hover:border-[#D85A30]/40"><p className="text-sm text-zinc-400">Financeiro</p><p className="mt-2 text-lg font-semibold text-white">Receitas e despesas</p><p className="mt-1 text-sm text-zinc-500">Acompanhar caixa e cobranças.</p></Link>
          <Link href="/clientes" className="rounded-3xl border border-white/10 bg-zinc-950/80 p-5 transition hover:border-[#D85A30]/40"><p className="text-sm text-zinc-400">Operação</p><p className="mt-2 text-lg font-semibold text-white">Clientes</p><p className="mt-1 text-sm text-zinc-500">Acessar a operação por cliente.</p></Link>
        </section>
      </div>
    </AppShell>
  );
}
