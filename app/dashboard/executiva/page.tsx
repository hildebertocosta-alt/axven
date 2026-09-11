import Link from "next/link";
import { AppShell } from "../../components/dashboard/AppShell";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { filterCrmByCampaignName, summarizeCrm, summarizeMeta, type CrmLeadRow, type MetaInsightRow } from "./dashboardData";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type Client = { id: string; nome: string; status_pagamento: string | null };
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const isoDate = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(date);
const validDate = (value: string | undefined) => /^\d{4}-\d{2}-\d{2}$/.test(value ?? "") ? value! : null;
const integer = (value: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value);
const percentage = (value: number | null) => value === null ? "—" : `${value.toFixed(2).replace(".", ",")}%`;
const multiple = (value: number | null) => value === null ? "—" : `${value.toFixed(2).replace(".", ",")}x`;

function money(value: number | null, currency = "BRL") {
  return value === null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
}

export default async function DashboardExecutivaPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const today = isoDate(new Date());
  const start = validDate(first(params.inicio)) ?? `${today.slice(0, 7)}-01`;
  const requestedEnd = validDate(first(params.fim)) ?? today;
  const end = requestedEnd >= start ? requestedEnd : start;

  const { data: clientsData, error: clientsError } = await supabaseAdmin.from("clientes").select("id,nome,status_pagamento").order("nome");
  if (clientsError) throw new Error("Não foi possível carregar os clientes.");
  const clients = (clientsData ?? []) as Client[];
  const requestedClient = first(params.cliente) ?? "all";
  const selectedClient = requestedClient === "all" || clients.some((client) => client.id === requestedClient) ? requestedClient : "all";

  let metaQuery = supabaseAdmin.from("meta_ads_insights_daily")
    .select("cliente_id,campaign_id,campaign_name,spend,impressions,reach,clicks,leads,lead_action_type,currency")
    .gte("metric_date", start).lte("metric_date", end);
  let crmQuery = supabaseAdmin.from("leads")
    .select("cliente_id,etapa,qualificado,valor_conversao,moeda,campanha")
    .gte("criado_em", `${start}T00:00:00-03:00`).lte("criado_em", `${end}T23:59:59.999-03:00`);
  if (selectedClient !== "all") {
    metaQuery = metaQuery.eq("cliente_id", selectedClient);
    crmQuery = crmQuery.eq("cliente_id", selectedClient);
  }

  const [{ data: metaData, error: metaError }, { data: crmData, error: crmError }] = await Promise.all([metaQuery, crmQuery]);
  if (metaError || crmError) throw new Error("Não foi possível carregar os dados executivos.");
  const allMetaRows = (metaData ?? []) as MetaInsightRow[];
  const allCrmRows = (crmData ?? []) as CrmLeadRow[];
  const campaignOptions = Array.from(new Map(allMetaRows.map((row) => [row.campaign_id, row.campaign_name || row.campaign_id])).entries()).sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  const requestedCampaign = first(params.campanha) ?? "all";
  const selectedCampaign = requestedCampaign === "all" || campaignOptions.some(([id]) => id === requestedCampaign) ? requestedCampaign : "all";
  const campaignName = selectedCampaign === "all" ? null : campaignOptions.find(([id]) => id === selectedCampaign)?.[1] ?? null;
  const metaRows = selectedCampaign === "all" ? allMetaRows : allMetaRows.filter((row) => row.campaign_id === selectedCampaign);
  const crmRows = filterCrmByCampaignName(allCrmRows, campaignName);
  const media = summarizeMeta(metaRows);
  const crm = summarizeCrm(crmRows);
  const currency = metaRows[0]?.currency ?? "BRL";
  const roas = media.spend > 0 && crm.revenue > 0 ? crm.revenue / media.spend : null;

  const byClient = clients.filter((client) => selectedClient === "all" || client.id === selectedClient).map((client) => {
    const clientMedia = summarizeMeta(metaRows.filter((row) => row.cliente_id === client.id));
    const clientCrm = summarizeCrm(crmRows.filter((row) => row.cliente_id === client.id));
    return { client, media: clientMedia, crm: clientCrm };
  }).filter((row) => row.media.spend > 0 || row.crm.crmLeads > 0).sort((a, b) => b.media.spend - a.media.spend);

  const campaigns = campaignOptions.map(([id, name]) => ({ id, name, ...summarizeMeta(allMetaRows.filter((row) => row.campaign_id === id)) })).sort((a, b) => b.spend - a.spend);
  const mediaCards = [
    ["Investimento", money(media.spend, currency), "Meta Insights diário"],
    ["Leads Meta", integer(media.metaLeads), "Somente action_type = lead"],
    ["CPL", money(media.cpl, currency), "Investimento ÷ Leads Meta"],
    ["Alcance acumulado", integer(media.reach), "Soma do alcance diário por anúncio"],
    ["Impressões", integer(media.impressions), "Entrega Meta"], ["Cliques", integer(media.clicks), "Cliques reportados"],
    ["CTR", percentage(media.ctr), "Cliques ÷ impressões"], ["CPC", money(media.cpc, currency), "Investimento ÷ cliques"],
    ["CPM", money(media.cpm, currency), "Custo por mil impressões"],
  ];

  return <AppShell title="Dashboard Executiva" subtitle="Axven Digital · mídia Meta e resultado comercial" activeLabel="Dashboard">
    <div className="mx-auto max-w-[1680px] space-y-5 pb-8">
      <section className="rounded-[28px] border border-white/[0.08] bg-[#0b0d11] p-6 lg:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#ff7559]">Visão executiva</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-white">Mídia e receita, sem misturar conceitos.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Lead Meta representa conversões reportadas pela Meta. Lead CRM representa registros efetivamente recebidos pela operação.</p></div>
          <form className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" method="get">
            <input aria-label="Data inicial" name="inicio" type="date" defaultValue={start} className="rounded-xl border border-white/10 bg-[#14161b] px-3 py-2.5 text-sm text-zinc-200" />
            <input aria-label="Data final" name="fim" type="date" defaultValue={end} className="rounded-xl border border-white/10 bg-[#14161b] px-3 py-2.5 text-sm text-zinc-200" />
            <select aria-label="Cliente" name="cliente" defaultValue={selectedClient} className="rounded-xl border border-white/10 bg-[#14161b] px-3 py-2.5 text-sm text-zinc-200"><option value="all">Todos os clientes</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.nome}</option>)}</select>
            <select aria-label="Campanha" name="campanha" defaultValue={selectedCampaign} className="rounded-xl border border-white/10 bg-[#14161b] px-3 py-2.5 text-sm text-zinc-200"><option value="all">Todas as campanhas</option>{campaignOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
            <button className="rounded-xl bg-[#ff5a3c] px-4 py-2.5 text-sm font-semibold text-white sm:col-span-2 xl:col-span-4">Aplicar filtros</button>
          </form>
        </div><p className="mt-4 text-xs text-zinc-600">Período: {start.split("-").reverse().join("/")} a {end.split("-").reverse().join("/")}</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{mediaCards.map(([label, value, help]) => <div key={label} className="rounded-[22px] border border-white/[0.08] bg-[#0b0d11] p-5"><p className="text-sm text-zinc-400">{label}</p><p className="mt-4 text-3xl font-semibold text-white">{value}</p><p className="mt-2 text-xs text-zinc-600">{help}</p></div>)}</section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{[
        ["Leads CRM", integer(crm.crmLeads), "Registros recebidos"], ["Qualificados", integer(crm.qualified), "CRM"],
        ["Vendas", integer(crm.sales), "Etapa fechado"], ["Faturamento", money(crm.revenue), "Vendas em BRL"], ["ROAS", multiple(roas), "Faturamento CRM ÷ mídia"],
      ].map(([label, value, help]) => <div key={label} className="rounded-[20px] border border-white/[0.07] bg-white/[0.025] p-4"><p className="text-xs text-zinc-500">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p><p className="mt-1 text-[11px] text-zinc-600">{help}</p></div>)}</section>

      <section className="rounded-[26px] border border-white/[0.08] bg-[#0b0d11] p-5 lg:p-6"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#ff7559]">Funil comercial</p><h2 className="mt-1 text-xl font-semibold text-white">Lead CRM → Qualificado → Venda</h2><div className="mt-6 grid gap-3 md:grid-cols-3">{[["Leads CRM", crm.crmLeads], ["Qualificados", crm.qualified], ["Vendas", crm.sales]].map(([label, value]) => <div key={label} className="rounded-2xl border border-white/[0.07] p-5"><p className="text-sm text-zinc-400">{label}</p><p className="mt-3 text-3xl font-semibold text-white">{integer(Number(value))}</p></div>)}</div>{selectedCampaign !== "all" && <p className="mt-4 text-xs text-amber-200/70">A mídia foi filtrada por campaign_id. O CRM ainda não possui campaign_id; a correlação comercial usa apenas correspondência exata do nome da campanha.</p>}</section>

      <section className="rounded-[26px] border border-white/[0.08] bg-[#0b0d11] p-5 lg:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-600">Por cliente</p><h2 className="mt-1 text-xl font-semibold text-white">Mídia e funil</h2></div><Link href="/clientes" className="text-sm text-[#ff846d]">Cliente 360 →</Link></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[980px] text-sm"><thead className="text-left text-xs text-zinc-600"><tr>{["Cliente", "Investimento", "Leads Meta", "CPL", "Leads CRM", "Qualificados", "Vendas", "Faturamento", "ROAS"].map((heading) => <th key={heading} className="border-b border-white/[0.07] px-3 py-3 font-medium">{heading}</th>)}</tr></thead><tbody>{byClient.map((row) => { const clientRoas = row.media.spend > 0 && row.crm.revenue > 0 ? row.crm.revenue / row.media.spend : null; return <tr key={row.client.id} className="border-b border-white/[0.05] text-zinc-300"><td className="px-3 py-4 font-medium text-white">{row.client.nome}</td><td className="px-3 py-4">{money(row.media.spend)}</td><td className="px-3 py-4">{integer(row.media.metaLeads)}</td><td className="px-3 py-4">{money(row.media.cpl)}</td><td className="px-3 py-4">{integer(row.crm.crmLeads)}</td><td className="px-3 py-4">{integer(row.crm.qualified)}</td><td className="px-3 py-4">{integer(row.crm.sales)}</td><td className="px-3 py-4">{money(row.crm.revenue)}</td><td className="px-3 py-4">{multiple(clientRoas)}</td></tr>; })}</tbody></table>{!byClient.length && <p className="py-8 text-center text-sm text-zinc-600">Nenhum dado real para os filtros selecionados.</p>}</div></section>

      <section className="rounded-[26px] border border-white/[0.08] bg-[#0b0d11] p-5 lg:p-6"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-600">Campanhas Meta</p><h2 className="mt-1 text-xl font-semibold text-white">Performance por campanha</h2><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{campaigns.map((campaign) => <div key={campaign.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"><p className="truncate font-medium text-white">{campaign.name}</p><p className="mt-1 truncate text-[11px] text-zinc-600">ID {campaign.id}</p><div className="mt-4 grid grid-cols-3 gap-2 text-xs text-zinc-500"><span>Invest. <b className="block text-base text-zinc-200">{money(campaign.spend)}</b></span><span>Leads Meta <b className="block text-base text-zinc-200">{integer(campaign.metaLeads)}</b></span><span>CPL <b className="block text-base text-zinc-200">{money(campaign.cpl)}</b></span></div></div>)}{!campaigns.length && <p className="text-sm text-zinc-600">Nenhuma campanha Meta sincronizada para o período.</p>}</div></section>
    </div>
  </AppShell>;
}
