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

function monthKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
}

export default async function DashboardExecutivaPage() {
  const mesAtual = monthKey();

  const [
    { data: leads, error: leadsError },
    { data: clientes },
    { data: financeiro },
    { data: despesas },
  ] = await Promise.all([
    supabaseAdmin
      .from("aquisicao_axven_leads")
      .select("etapa, qualificado, agendado_em, venda_em, valor_venda, moeda, utm_campaign, campaign_id, ad_id, criado_em"),
    supabaseAdmin.from("clientes").select("id, status_pagamento, honorarios"),
    supabaseAdmin.from("financeiro").select("valor, status").eq("mes_referencia", mesAtual),
    supabaseAdmin.from("despesas").select("valor").eq("mes_referencia", mesAtual),
  ]);

  if (leadsError) throw new Error(`Falha ao carregar aquisição Axven: ${leadsError.message}`);

  const rows = leads ?? [];
  const stageCounts = Object.fromEntries(STAGES.map(([stage]) => [stage, rows.filter((lead) => lead.etapa === stage).length]));
  const totalLeads = rows.length;
  const qualificados = rows.filter((lead) => lead.qualificado).length;
  const agendados = rows.filter((lead) => Boolean(lead.agendado_em) || lead.etapa === "agendado").length;
  const propostas = rows.filter((lead) => lead.etapa === "proposta_enviada").length;
  const fechados = rows.filter((lead) => lead.etapa === "fechado").length;
  const receitaNova = rows
    .filter((lead) => lead.etapa === "fechado" && (lead.moeda ?? "BRL") === "BRL")
    .reduce((sum, lead) => sum + Number(lead.valor_venda ?? 0), 0);

  const clientesAtivos = (clientes ?? []).filter((cliente) => cliente.status_pagamento !== "cancelado");
  const mrr = clientesAtivos.reduce((sum, cliente) => sum + Number(cliente.honorarios ?? 0), 0);
  const receitaMes = (financeiro ?? []).reduce((sum, item) => sum + Number(item.valor ?? 0), 0);
  const despesasMes = (despesas ?? []).reduce((sum, item) => sum + Number(item.valor ?? 0), 0);
  const margemMes = receitaMes - despesasMes;

  const taxaQualificacao = totalLeads ? (qualificados / totalLeads) * 100 : 0;
  const taxaAgendamento = qualificados ? (agendados / qualificados) * 100 : 0;
  const taxaProposta = agendados ? (propostas / agendados) * 100 : 0;
  const taxaFechamento = agendados ? (fechados / agendados) * 100 : 0;

  const maxStage = Math.max(...STAGES.map(([stage]) => Number(stageCounts[stage] ?? 0)), 1);

  return (
    <AppShell title="Dashboard Executiva" subtitle="Axven Digital · visão geral da operação" activeLabel="Dashboard">
      <div className="space-y-7">
        <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(255,90,60,0.16),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.035),rgba(255,255,255,0.01))] p-6 lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#FF5A3C]/25 bg-[#FF5A3C]/10 px-3 py-1 text-xs font-medium text-[#ff9f89]">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Operação conectada a dados reais
              </div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">Visão executiva</p>
              <h2 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight text-white lg:text-4xl">A Axven em uma única tela.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Financeiro, aquisição e comercial organizados para mostrar o que está crescendo, o que está convertendo e onde agir.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href="/pipeline" className="rounded-2xl border border-[#FF5A3C]/30 bg-gradient-to-r from-[#FF6B35]/20 to-[#FF3D57]/10 px-4 py-2.5 text-sm font-medium text-[#ffb09e] transition hover:border-[#FF5A3C]/50">Abrir CRM</Link>
              <Link href="/financeiro" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10">Financeiro</Link>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Empresa</p>
              <h3 className="mt-1 text-xl font-semibold text-white">Saúde da Axven</h3>
            </div>
            <span className="text-xs text-zinc-500">Mês atual · America/Sao_Paulo</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-[#FF5A3C]/25 bg-gradient-to-br from-[#FF5A3C]/14 to-transparent p-5">
              <p className="text-sm text-[#ff9f89]">MRR</p>
              <p className="mt-3 text-3xl font-semibold text-white">{money(mrr)}</p>
              <p className="mt-2 text-xs text-zinc-500">Honorários de clientes ativos</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#0d0d11] p-5">
              <p className="text-sm text-zinc-400">Receita do mês</p>
              <p className="mt-3 text-3xl font-semibold text-white">{money(receitaMes)}</p>
              <p className="mt-2 text-xs text-zinc-500">Financeiro registrado no mês</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#0d0d11] p-5">
              <p className="text-sm text-zinc-400">Margem do mês</p>
              <p className={`mt-3 text-3xl font-semibold ${margemMes >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{money(margemMes)}</p>
              <p className="mt-2 text-xs text-zinc-500">Receita menos despesas registradas</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#0d0d11] p-5">
              <p className="text-sm text-zinc-400">Clientes ativos</p>
              <p className="mt-3 text-3xl font-semibold text-white">{clientesAtivos.length}</p>
              <p className="mt-2 text-xs text-zinc-500">Base operacional atual</p>
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.55fr_0.75fr]">
          <div className="rounded-[32px] border border-white/10 bg-[#0b0b0f] p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#ff8267]">Aquisição + comercial</p>
                <h3 className="mt-1 text-xl font-semibold text-white">Funil real da Axven</h3>
                <p className="mt-1 text-sm text-zinc-500">Lead → Qualificado → Agendado → Proposta → Fechado</p>
              </div>
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3 text-right">
                <p className="text-xs text-emerald-200/70">Receita comercial nova</p>
                <p className="mt-1 text-xl font-semibold text-emerald-300">{money(receitaNova)}</p>
              </div>
            </div>

            <div className="mt-7 grid gap-3 lg:grid-cols-5">
              {STAGES.map(([stage, label], index) => {
                const total = Number(stageCounts[stage] ?? 0);
                const width = Math.max((total / maxStage) * 100, total > 0 ? 12 : 0);
                return (
                  <div key={stage} className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-white/5"><div className="h-full bg-gradient-to-r from-[#FF6B35] to-[#FF3D57]" style={{ width: `${width}%` }} /></div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[11px] text-zinc-400">{index + 1}</span>
                      {index < STAGES.length - 1 ? <span className="text-zinc-700">→</span> : null}
                    </div>
                    <p className="mt-4 text-xs uppercase tracking-wide text-zinc-500">{label}</p>
                    <p className="mt-1 text-3xl font-semibold text-white">{total}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Qualificação", pct(taxaQualificacao)],
                ["Qualificado → agenda", pct(taxaAgendamento)],
                ["Agenda → proposta", pct(taxaProposta)],
                ["Agenda → fechamento", pct(taxaFechamento)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                  <p className="text-xs text-zinc-500">{label}</p>
                  <p className="mt-2 text-xl font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[32px] border border-[#FF5A3C]/20 bg-gradient-to-br from-[#FF5A3C]/10 to-transparent p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#ff8267]">Comercial</p>
              <p className="mt-3 text-4xl font-semibold text-white">{fechados}</p>
              <p className="mt-1 text-sm text-zinc-400">fechamento{fechados === 1 ? "" : "s"} registrado{fechados === 1 ? "" : "s"}</p>
              <Link href="/pipeline" className="mt-5 inline-flex text-sm font-medium text-[#ff9f89]">Ver pipeline →</Link>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-[#0d0d11] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Base de aquisição</p>
              <p className="mt-3 text-4xl font-semibold text-white">{totalLeads}</p>
              <p className="mt-1 text-sm text-zinc-400">leads registrados</p>
              <p className="mt-4 text-xs leading-5 text-zinc-500">Sem números simulados. Quando não houver dado, o painel permanece zerado.</p>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Operação</p>
            <h3 className="mt-1 text-xl font-semibold text-white">Atalhos executivos</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Link href="/pipeline" className="group rounded-3xl border border-white/10 bg-[#0d0d11] p-5 transition hover:-translate-y-0.5 hover:border-[#FF5A3C]/35">
              <span className="text-xs text-zinc-500">CRM</span>
              <p className="mt-2 text-lg font-semibold text-white">Pipeline comercial</p>
              <p className="mt-1 text-sm text-zinc-500">Leads, etapas, propostas e fechamento.</p>
              <p className="mt-4 text-sm text-[#ff8267]">Abrir CRM →</p>
            </Link>
            <Link href="/financeiro" className="group rounded-3xl border border-white/10 bg-[#0d0d11] p-5 transition hover:-translate-y-0.5 hover:border-[#FF5A3C]/35">
              <span className="text-xs text-zinc-500">Financeiro</span>
              <p className="mt-2 text-lg font-semibold text-white">Receitas e despesas</p>
              <p className="mt-1 text-sm text-zinc-500">Caixa, cobranças e custos da operação.</p>
              <p className="mt-4 text-sm text-[#ff8267]">Abrir financeiro →</p>
            </Link>
            <Link href="/clientes" className="group rounded-3xl border border-white/10 bg-[#0d0d11] p-5 transition hover:-translate-y-0.5 hover:border-[#FF5A3C]/35">
              <span className="text-xs text-zinc-500">Clientes</span>
              <p className="mt-2 text-lg font-semibold text-white">Operação por cliente</p>
              <p className="mt-1 text-sm text-zinc-500">Acessar a visão operacional e Cliente 360.</p>
              <p className="mt-4 text-sm text-[#ff8267]">Ver clientes →</p>
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
