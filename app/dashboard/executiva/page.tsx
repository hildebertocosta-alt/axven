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
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
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

function shortDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
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
      .select("id, nome, etapa, qualificado, agendado_em, venda_em, valor_venda, moeda, utm_campaign, campaign_id, ad_id, criado_em")
      .order("criado_em", { ascending: false }),
    supabaseAdmin
      .from("clientes")
      .select("id, nome, nicho, status_pagamento, honorarios")
      .order("honorarios", { ascending: false }),
    supabaseAdmin.from("financeiro").select("valor, status").eq("mes_referencia", mesAtual),
    supabaseAdmin.from("despesas").select("valor").eq("mes_referencia", mesAtual),
  ]);

  if (leadsError) throw new Error(`Falha ao carregar aquisição Axven: ${leadsError.message}`);

  const rows = leads ?? [];
  const stageCounts = Object.fromEntries(
    STAGES.map(([stage]) => [stage, rows.filter((lead) => lead.etapa === stage).length]),
  );

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
  const maxStage = Math.max(totalLeads, qualificados, agendados, propostas, fechados, 1);

  const campaigns = Array.from(
    rows.reduce((map, lead) => {
      const key = lead.utm_campaign || lead.campaign_id || "Sem campanha identificada";
      const current = map.get(key) ?? { leads: 0, qualificados: 0, agendados: 0, fechados: 0 };
      current.leads += 1;
      if (lead.qualificado) current.qualificados += 1;
      if (lead.agendado_em || lead.etapa === "agendado") current.agendados += 1;
      if (lead.etapa === "fechado") current.fechados += 1;
      map.set(key, current);
      return map;
    }, new Map<string, { leads: number; qualificados: number; agendados: number; fechados: number }>()),
  )
    .sort((a, b) => b[1].leads - a[1].leads)
    .slice(0, 5);

  const latestLeads = rows.slice(0, 5);
  const topClients = clientesAtivos.slice(0, 5);

  return (
    <AppShell title="Dashboard Executiva" subtitle="Axven Digital · visão geral da operação" activeLabel="Dashboard">
      <div className="mx-auto max-w-[1680px] space-y-5 pb-8">
        <section className="relative overflow-hidden rounded-[30px] border border-white/[0.08] bg-[#0b0d11] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] lg:p-8">
          <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-[#ff5a3c]/12 blur-3xl" />
          <div className="pointer-events-none absolute right-16 top-6 h-32 w-32 rotate-45 rounded-[28px] border border-[#ff6b35]/20 bg-gradient-to-br from-[#ff6b35]/10 to-transparent" />
          <div className="relative flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-sm text-zinc-400">Boa semana, Junior.</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-white lg:text-5xl">Crescimento em tempo real.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Visão completa da Axven, clientes, aquisição e comercial em um único lugar.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/pipeline" className="rounded-xl border border-[#ff6b35]/30 bg-[#ff5a3c]/10 px-4 py-2.5 text-sm font-medium text-[#ff9a82] transition hover:bg-[#ff5a3c]/15">Abrir CRM</Link>
              <Link href="/clientes" className="rounded-xl border border-white/10 bg-white/[0.035] px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/[0.06]">Ver clientes</Link>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["MRR", money(mrr), "Honorários ativos", "↗"],
            ["Receita do mês", money(receitaMes), "Financeiro registrado", "↗"],
            ["Margem do mês", money(margemMes), "Receita menos despesas", margemMes >= 0 ? "↗" : "↘"],
            ["Clientes ativos", String(clientesAtivos.length), "Base operacional atual", "●"],
          ].map(([label, value, help, signal], index) => (
            <div key={label} className={`rounded-[22px] border p-5 ${index === 0 ? "border-[#ff5a3c]/25 bg-gradient-to-br from-[#ff5a3c]/10 via-[#121015] to-[#0b0d11]" : "border-white/[0.08] bg-[#0b0d11]"}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-zinc-400">{label}</p>
                <span className={signal === "↘" ? "text-rose-300" : "text-emerald-300"}>{signal}</span>
              </div>
              <p className="mt-4 text-3xl font-semibold tracking-tight text-white">{value}</p>
              <p className="mt-2 text-xs text-zinc-600">{help}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
          <div className="rounded-[26px] border border-white/[0.08] bg-[#0b0d11] p-5 lg:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#ff7559]">Aquisição Axven</p>
                <h2 className="mt-1 text-xl font-semibold text-white">Funil de conversão</h2>
                <p className="mt-1 text-sm text-zinc-500">Lead → Qualificado → Agendado → Proposta → Fechado</p>
              </div>
              <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.06] px-4 py-3 text-right">
                <p className="text-xs text-emerald-200/60">Receita comercial nova</p>
                <p className="mt-1 text-xl font-semibold text-emerald-300">{money(receitaNova)}</p>
              </div>
            </div>

            <div className="mt-7 space-y-3">
              {STAGES.map(([stage, label], index) => {
                const total = Number(stageCounts[stage] ?? 0);
                const width = Math.max((total / maxStage) * 100, total > 0 ? 8 : 0);
                return (
                  <div key={stage} className="grid grid-cols-[105px_1fr_48px] items-center gap-3">
                    <div>
                      <p className="text-sm font-medium text-zinc-300">{label}</p>
                      <p className="mt-0.5 text-[11px] text-zinc-600">Etapa {index + 1}</p>
                    </div>
                    <div className="h-10 overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.025]">
                      <div className="flex h-full items-center rounded-xl bg-gradient-to-r from-[#ff6b35]/90 via-[#ff5a3c]/75 to-[#ff3d57]/45 px-3" style={{ width: `${width}%` }}>
                        {total > 0 ? <span className="text-xs font-medium text-white/90">{pct((total / maxStage) * 100)}</span> : null}
                      </div>
                    </div>
                    <p className="text-right text-xl font-semibold text-white">{total}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Qualificação", pct(taxaQualificacao)],
                ["Qualificado → agenda", pct(taxaAgendamento)],
                ["Agenda → proposta", pct(taxaProposta)],
                ["Agenda → fechamento", pct(taxaFechamento)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <p className="text-xs text-zinc-500">{label}</p>
                  <p className="mt-2 text-xl font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[26px] border border-white/[0.08] bg-[#0b0d11] p-5 lg:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-600">Campanhas</p>
                <h2 className="mt-1 text-xl font-semibold text-white">Origem dos leads</h2>
              </div>
              <span className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-xs text-zinc-500">Dados reais</span>
            </div>
            <div className="mt-6 space-y-4">
              {campaigns.length ? campaigns.map(([campaign, stats]) => {
                const width = totalLeads ? Math.max((stats.leads / totalLeads) * 100, 4) : 0;
                return (
                  <div key={campaign}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="truncate text-sm text-zinc-300">{campaign}</p>
                      <span className="text-sm font-semibold text-white">{stats.leads}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]"><div className="h-full rounded-full bg-gradient-to-r from-[#ff6b35] to-[#ff3d57]" style={{ width: `${width}%` }} /></div>
                    <div className="mt-1.5 flex gap-3 text-[11px] text-zinc-600"><span>Qualif. {stats.qualificados}</span><span>Agenda {stats.agendados}</span><span>Fechados {stats.fechados}</span></div>
                  </div>
                );
              }) : <div className="rounded-2xl border border-dashed border-white/[0.08] p-6 text-sm text-zinc-600">Nenhuma campanha identificada nos leads atuais.</div>}
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[26px] border border-white/[0.08] bg-[#0b0d11] p-5 lg:p-6">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-600">Clientes</p><h2 className="mt-1 text-xl font-semibold text-white">Carteira ativa</h2></div>
              <Link href="/clientes" className="text-sm text-[#ff846d]">Ver todos →</Link>
            </div>
            <div className="mt-5 overflow-hidden rounded-2xl border border-white/[0.07]">
              <div className="grid grid-cols-[1.4fr_1fr_0.7fr] bg-white/[0.025] px-4 py-3 text-[11px] uppercase tracking-[0.14em] text-zinc-600"><span>Cliente</span><span>Nicho</span><span className="text-right">MRR</span></div>
              {topClients.length ? topClients.map((cliente) => (
                <div key={cliente.id} className="grid grid-cols-[1.4fr_1fr_0.7fr] items-center border-t border-white/[0.06] px-4 py-3.5">
                  <div><p className="truncate text-sm font-medium text-zinc-200">{cliente.nome}</p><p className="mt-0.5 text-[11px] text-emerald-400/70">Ativo</p></div>
                  <p className="truncate text-sm text-zinc-500">{cliente.nicho || "—"}</p>
                  <p className="text-right text-sm font-semibold text-white">{money(Number(cliente.honorarios ?? 0))}</p>
                </div>
              )) : <p className="px-4 py-8 text-sm text-zinc-600">Nenhum cliente ativo.</p>}
            </div>
          </div>

          <div className="rounded-[26px] border border-white/[0.08] bg-[#0b0d11] p-5 lg:p-6">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-600">Tempo real</p><h2 className="mt-1 text-xl font-semibold text-white">Últimos leads</h2></div>
              <Link href="/pipeline" className="text-sm text-[#ff846d]">Pipeline →</Link>
            </div>
            <div className="mt-5 space-y-2.5">
              {latestLeads.length ? latestLeads.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5">
                  <div className="min-w-0"><p className="truncate text-sm font-medium text-zinc-200">{lead.nome || "Lead sem nome"}</p><p className="mt-1 truncate text-xs text-zinc-600">{lead.utm_campaign || lead.campaign_id || "Origem não identificada"}</p></div>
                  <div className="text-right"><p className="text-xs capitalize text-[#ff846d]">{String(lead.etapa || "lead").replaceAll("_", " ")}</p><p className="mt-1 text-[11px] text-zinc-600">{shortDate(lead.criado_em)}</p></div>
                </div>
              )) : <div className="rounded-2xl border border-dashed border-white/[0.08] p-6 text-sm text-zinc-600">Nenhum lead registrado.</div>}
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-4">
          {[
            ["CRM Comercial", "/pipeline", "Leads, oportunidades e vendas"],
            ["Clientes", "/clientes", "Cliente 360 e operação"],
            ["Financeiro", "/financeiro", "Receitas, despesas e caixa"],
            ["Relatórios", "/relatorios", "Performance consolidada"],
          ].map(([label, href, help]) => (
            <Link key={label} href={href} className="group rounded-[20px] border border-white/[0.07] bg-[#0b0d11] p-4 transition hover:-translate-y-0.5 hover:border-[#ff5a3c]/25">
              <div className="flex items-center justify-between gap-3"><p className="font-medium text-zinc-200">{label}</p><span className="text-zinc-700 transition group-hover:text-[#ff7559]">↗</span></div>
              <p className="mt-2 text-xs leading-5 text-zinc-600">{help}</p>
            </Link>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
