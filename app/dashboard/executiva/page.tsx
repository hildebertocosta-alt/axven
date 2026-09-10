import Link from "next/link";
import { AppShell } from "../../components/dashboard/AppShell";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { latestReportPerClient, summarizeLeads, summarizeReports, type LeadRow, type ReportRow } from "./dashboardData";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type Cliente = { id: string; nome: string; status_pagamento: string | null };
type Lead = LeadRow & { id: string; campanha: string | null; criado_em: string };
type Report = ReportRow & { periodo_inicio: string; periodo_fim: string };

function money(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
}
function decimal(value: number | null) { return value === null ? "—" : `${value.toFixed(2).replace(".", ",")}x`; }
function pct(part: number, total: number) { return total ? `${((part / total) * 100).toFixed(1).replace(".", ",")}%` : "0,0%"; }
function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }

function resolvePeriod(value?: string) {
  const period = value === "30" || value === "all" ? value : "90";
  if (period === "all") return { period, start: null as Date | null, end: null as Date | null, label: "Todo o histórico" };
  const days = Number(period);
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  start.setHours(0, 0, 0, 0);
  return { period, start, end, label: `Últimos ${days} dias` };
}

export default async function DashboardExecutivaPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const selectedClient = first(params.cliente) ?? "all";
  const selectedCampaign = first(params.campanha) ?? "all";
  const period = resolvePeriod(first(params.periodo));

  const [{ data: clientesData, error: clientesError }, { data: leadsData, error: leadsError }, { data: reportsData, error: reportsError }] = await Promise.all([
    supabaseAdmin.from("clientes").select("id,nome,status_pagamento").order("nome"),
    supabaseAdmin.from("leads").select("id,cliente_id,etapa,qualificado,valor_conversao,moeda,campanha,criado_em").order("criado_em", { ascending: false }),
    supabaseAdmin.from("relatorios").select("cliente_id,investimento,leads,receita,periodo_inicio,periodo_fim,criado_em").order("criado_em", { ascending: false }),
  ]);
  if (clientesError || leadsError || reportsError) throw new Error("Não foi possível carregar os dados executivos.");

  const clientes = (clientesData ?? []) as Cliente[];
  const clientIds = new Set(clientes.map((cliente) => cliente.id));
  const validClient = selectedClient === "all" || clientIds.has(selectedClient) ? selectedClient : "all";
  const inPeriod = (date: string) => !period.start || (new Date(date) >= period.start && new Date(date) <= (period.end ?? new Date()));

  const periodLeads = ((leadsData ?? []) as Lead[]).filter((lead) => inPeriod(lead.criado_em) && (validClient === "all" || lead.cliente_id === validClient));
  const campaignOptions = Array.from(new Set(periodLeads.map((lead) => lead.campanha).filter((value): value is string => Boolean(value)))).sort();
  const validCampaign = selectedCampaign === "all" || campaignOptions.includes(selectedCampaign) ? selectedCampaign : "all";
  const leads = periodLeads.filter((lead) => validCampaign === "all" || lead.campanha === validCampaign);

  const reports = ((reportsData ?? []) as Report[]).filter((report) => {
    if (validClient !== "all" && report.cliente_id !== validClient) return false;
    if (!period.start) return true;
    return new Date(`${report.periodo_fim}T23:59:59-03:00`) >= period.start && new Date(`${report.periodo_inicio}T00:00:00-03:00`) <= (period.end ?? new Date());
  });
  const latestReports = latestReportPerClient(reports);
  const reportSummary = validCampaign === "all" ? summarizeReports([...latestReports.values()]) : { investimento: null, cpl: null, roas: null };
  const leadSummary = summarizeLeads(leads);

  const byClient = clientes
    .filter((cliente) => validClient === "all" || cliente.id === validClient)
    .map((cliente) => {
      const summary = summarizeLeads(leads.filter((lead) => lead.cliente_id === cliente.id));
      const report = validCampaign === "all" ? latestReports.get(cliente.id) : undefined;
      const media = report ? summarizeReports([report]) : { investimento: null, cpl: null, roas: null };
      return { cliente, ...summary, ...media };
    })
    .filter((row) => row.total > 0 || row.investimento !== null)
    .sort((a, b) => b.total - a.total);

  const campaigns = Array.from(leads.reduce((map, lead) => {
    const name = lead.campanha || "Sem campanha identificada";
    const rows = map.get(name) ?? [];
    rows.push(lead);
    map.set(name, rows);
    return map;
  }, new Map<string, Lead[]>())).map(([name, campaignLeads]) => ({ name, ...summarizeLeads(campaignLeads) })).sort((a, b) => b.total - a.total);

  return <AppShell title="Dashboard Executiva" subtitle="Axven Digital · dados reais de mídia, CRM e vendas" activeLabel="Dashboard">
    <div className="mx-auto max-w-[1680px] space-y-5 pb-8">
      <section className="rounded-[28px] border border-white/[0.08] bg-[#0b0d11] p-6 lg:p-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#ff7559]">Visão executiva</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-white">Performance da carteira.</h1><p className="mt-3 text-sm text-zinc-400">Funil do CRM e último relatório de mídia disponível por cliente no período.</p></div>
          <form className="grid gap-2 sm:grid-cols-3" method="get">
            <select name="periodo" defaultValue={period.period} className="rounded-xl border border-white/10 bg-[#14161b] px-3 py-2.5 text-sm text-zinc-200"><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option><option value="all">Todo o histórico</option></select>
            <select name="cliente" defaultValue={validClient} className="rounded-xl border border-white/10 bg-[#14161b] px-3 py-2.5 text-sm text-zinc-200"><option value="all">Todos os clientes</option>{clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>)}</select>
            <select name="campanha" defaultValue={validCampaign} className="rounded-xl border border-white/10 bg-[#14161b] px-3 py-2.5 text-sm text-zinc-200"><option value="all">Todas as campanhas</option>{campaignOptions.map((campaign) => <option key={campaign} value={campaign}>{campaign}</option>)}</select>
            <button className="rounded-xl bg-[#ff5a3c] px-4 py-2.5 text-sm font-semibold text-white sm:col-span-3">Aplicar filtros</button>
          </form>
        </div>
        <p className="mt-4 text-xs text-zinc-600">{period.label}{validCampaign !== "all" ? " · mídia indisponível por campanha nos snapshots atuais" : ""}</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[["Investimento", money(reportSummary.investimento), "Último snapshot real por cliente"],["Leads CRM", String(leadSummary.total), "Registros no período"],["Qualificados", String(leadSummary.qualificados), pct(leadSummary.qualificados, leadSummary.total)],["Vendas", String(leadSummary.vendas), money(leadSummary.faturamento)]].map(([label,value,help]) => <div key={label} className="rounded-[22px] border border-white/[0.08] bg-[#0b0d11] p-5"><p className="text-sm text-zinc-400">{label}</p><p className="mt-4 text-3xl font-semibold text-white">{value}</p><p className="mt-2 text-xs text-zinc-600">{help}</p></div>)}
      </section>
      <section className="grid gap-3 sm:grid-cols-3">
        {[["Faturamento CRM", money(leadSummary.faturamento)],["CPL reportado", money(reportSummary.cpl)],["ROAS reportado", decimal(reportSummary.roas)]].map(([label,value]) => <div key={label} className="rounded-[20px] border border-white/[0.07] bg-white/[0.025] p-4"><p className="text-xs text-zinc-500">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></div>)}
      </section>

      <section className="rounded-[26px] border border-white/[0.08] bg-[#0b0d11] p-5 lg:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#ff7559]">Funil consolidado</p><h2 className="mt-1 text-xl font-semibold text-white">Lead → Qualificado → Venda</h2>
        <div className="mt-6 grid gap-3 md:grid-cols-3">{[["Leads",leadSummary.total],["Qualificados",leadSummary.qualificados],["Vendas",leadSummary.vendas]].map(([label,value]) => <div key={label} className="rounded-2xl border border-white/[0.07] p-5"><div className="flex items-end justify-between"><p className="text-sm text-zinc-400">{label}</p><p className="text-2xl font-semibold text-white">{value}</p></div><div className="mt-4 h-2 rounded-full bg-white/[0.05]"><div className="h-full rounded-full bg-gradient-to-r from-[#ff6b35] to-[#ff3d57]" style={{width:`${leadSummary.total ? Math.max((Number(value)/leadSummary.total)*100, Number(value)>0?4:0) : 0}%`}} /></div></div>)}</div>
      </section>

      <section className="rounded-[26px] border border-white/[0.08] bg-[#0b0d11] p-5 lg:p-6">
        <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-600">Por cliente</p><h2 className="mt-1 text-xl font-semibold text-white">Mídia, funil e receita</h2></div><Link href="/clientes" className="text-sm text-[#ff846d]">Cliente 360 →</Link></div>
        <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="text-left text-xs text-zinc-600"><tr>{["Cliente","Investimento","Leads","Qualificados","Vendas","Faturamento","CPL","ROAS"].map((h)=><th key={h} className="border-b border-white/[0.07] px-3 py-3 font-medium">{h}</th>)}</tr></thead><tbody>{byClient.map((row)=><tr key={row.cliente.id} className="border-b border-white/[0.05] text-zinc-300"><td className="px-3 py-4 font-medium text-white">{row.cliente.nome}</td><td className="px-3 py-4">{money(row.investimento)}</td><td className="px-3 py-4">{row.total}</td><td className="px-3 py-4">{row.qualificados}</td><td className="px-3 py-4">{row.vendas}</td><td className="px-3 py-4">{money(row.faturamento)}</td><td className="px-3 py-4">{money(row.cpl)}</td><td className="px-3 py-4">{decimal(row.roas)}</td></tr>)}</tbody></table>{!byClient.length && <p className="py-8 text-center text-sm text-zinc-600">Nenhum dado real para os filtros selecionados.</p>}</div>
      </section>

      <section className="rounded-[26px] border border-white/[0.08] bg-[#0b0d11] p-5 lg:p-6"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-600">Campanhas no CRM</p><h2 className="mt-1 text-xl font-semibold text-white">Funil por campanha</h2><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{campaigns.map((campaign)=><div key={campaign.name} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"><p className="truncate font-medium text-white">{campaign.name}</p><div className="mt-4 grid grid-cols-3 gap-2 text-xs text-zinc-500"><span>Leads <b className="block text-base text-zinc-200">{campaign.total}</b></span><span>Qualif. <b className="block text-base text-zinc-200">{campaign.qualificados}</b></span><span>Vendas <b className="block text-base text-zinc-200">{campaign.vendas}</b></span></div></div>)}{!campaigns.length && <p className="text-sm text-zinc-600">Nenhuma campanha identificada.</p>}</div></section>
    </div>
  </AppShell>;
}
