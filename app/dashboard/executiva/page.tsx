import Link from "next/link";
import { AppShell } from "../../components/dashboard/AppShell";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { filterAxvenByAttribution, filterCrmByCampaignName, safeRatio, summarizeAxvenCrm, summarizeCrm, summarizeMeta, type AxvenBookingRow, type AxvenLeadRow, type AxvenTimelineRow, type CrmLeadRow, type MetaInsightRow } from "./dashboardData";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const AXVEN_CLIENT_ID = "48293810-59a2-46ef-a992-772c87d12475";
type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type Client = { id:string; nome:string; status_pagamento:string|null };
type MetricData = { label:string; value:string; help:string };
const first=(v:string|string[]|undefined)=>Array.isArray(v)?v[0]:v;
const isoDate=(d:Date)=>new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo"}).format(d);
const validDate=(v:string|undefined)=>/^\d{4}-\d{2}-\d{2}$/.test(v??"")?v!:null;
const integer=(v:number)=>new Intl.NumberFormat("pt-BR",{maximumFractionDigits:0}).format(v);
const percentage=(v:number|null)=>v===null?"—":`${v.toFixed(2).replace(".",",")}%`;
const multiple=(v:number|null)=>v===null?"—":`${v.toFixed(2).replace(".",",")}x`;
const money=(v:number|null,currency="BRL")=>v===null?"—":new Intl.NumberFormat("pt-BR",{style:"currency",currency,maximumFractionDigits:2}).format(v);
const Metric=({label,value,help}:MetricData)=><div className="rounded-[20px] border border-white/[0.07] bg-white/[0.025] p-4"><p className="text-xs text-zinc-500">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p><p className="mt-1 text-[11px] text-zinc-600">{help}</p></div>;

export default async function DashboardExecutivaPage({searchParams}:{searchParams:SearchParams}) {
  const params=await searchParams;
  const today=isoDate(new Date());
  const start=validDate(first(params.inicio))??`${today.slice(0,7)}-01`;
  const requestedEnd=validDate(first(params.fim))??today;
  const end=requestedEnd>=start?requestedEnd:start;
  const {data:clientsData,error:clientsError}=await supabaseAdmin.from("clientes").select("id,nome,status_pagamento").order("nome");
  if(clientsError) throw new Error("Não foi possível carregar os clientes.");
  const clients=(clientsData??[]) as Client[];
  const requestedClient=first(params.cliente)??"all";
  const selectedClient=requestedClient==="all"||clients.some(c=>c.id===requestedClient)?requestedClient:"all";
  const isAxven=selectedClient===AXVEN_CLIENT_ID;

  let metaQuery=supabaseAdmin.from("meta_ads_insights_daily").select("cliente_id,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,reach,clicks,leads,lead_action_type,currency").gte("metric_date",start).lte("metric_date",end);
  if(selectedClient!=="all") metaQuery=metaQuery.eq("cliente_id",selectedClient);
  const {data:metaData,error:metaError}=await metaQuery;
  if(metaError) throw new Error("Não foi possível carregar os dados executivos.");
  const allMetaRows=(metaData??[]) as MetaInsightRow[];
  const campaignOptions=Array.from(new Map(allMetaRows.map(r=>[r.campaign_id,r.campaign_name||r.campaign_id])).entries()).sort((a,b)=>a[1].localeCompare(b[1],"pt-BR"));
  const requestedCampaign=first(params.campanha)??"all";
  const selectedCampaign=requestedCampaign==="all"||campaignOptions.some(([id])=>id===requestedCampaign)?requestedCampaign:"all";
  const campaignName=selectedCampaign==="all"?null:campaignOptions.find(([id])=>id===selectedCampaign)?.[1]??null;
  const campaignId=selectedCampaign==="all"?null:selectedCampaign;
  const metaRows=campaignId?allMetaRows.filter(r=>r.campaign_id===campaignId):allMetaRows;

  let publicCrmRows:CrmLeadRow[]=[];
  let axvenLeads:AxvenLeadRow[]=[];
  let bookings:AxvenBookingRow[]=[];
  let timeline:AxvenTimelineRow[]=[];
  if(isAxven){
    const {data,error}=await supabaseAdmin.from("aquisicao_axven_leads").select("id,campaign_id,adset_id,ad_id,etapa,qualificado,agendado_em,venda_em,valor_venda,moeda").gte("criado_em",`${start}T00:00:00-03:00`).lte("criado_em",`${end}T23:59:59.999-03:00`);
    if(error) throw new Error("Não foi possível carregar os dados comerciais da Axven.");
    axvenLeads=(data??[]) as AxvenLeadRow[];
    const ids=axvenLeads.map(l=>l.id);
    if(ids.length){
      const [b,e]=await Promise.all([supabaseAdmin.from("aquisicao_axven_agendamentos").select("lead_id,status").in("lead_id",ids),supabaseAdmin.from("aquisicao_axven_lead_eventos").select("lead_id,etapa_nova").in("lead_id",ids)]);
      if(b.error||e.error) throw new Error("Não foi possível carregar o histórico comercial da Axven.");
      bookings=(b.data??[]) as AxvenBookingRow[]; timeline=(e.data??[]) as AxvenTimelineRow[];
    }
  }else{
    let query=supabaseAdmin.from("leads").select("cliente_id,etapa,qualificado,valor_conversao,moeda,campanha").gte("criado_em",`${start}T00:00:00-03:00`).lte("criado_em",`${end}T23:59:59.999-03:00`);
    if(selectedClient!=="all") query=query.eq("cliente_id",selectedClient);
    const {data,error}=await query;
    if(error) throw new Error("Não foi possível carregar os dados executivos.");
    publicCrmRows=(data??[]) as CrmLeadRow[];
  }

  const filteredAxven=filterAxvenByAttribution(axvenLeads,campaignId);
  const crmRows=isAxven?[]:filterCrmByCampaignName(publicCrmRows,campaignName);
  const media=summarizeMeta(metaRows);
  const crm=isAxven?summarizeAxvenCrm(filteredAxven,bookings,timeline):{...summarizeCrm(crmRows),scheduled:0,proposals:0};
  const currency=metaRows[0]?.currency??"BRL";
  const roas=safeRatio(crm.revenue,media.spend);

  const campaigns=campaignOptions.map(([id,name])=>{
    const media=summarizeMeta(allMetaRows.filter(r=>r.campaign_id===id));
    const rows=isAxven?filterAxvenByAttribution(axvenLeads,id):filterCrmByCampaignName(publicCrmRows,name);
    const crm=isAxven?summarizeAxvenCrm(rows as AxvenLeadRow[],bookings,timeline):{...summarizeCrm(rows as CrmLeadRow[]),scheduled:0,proposals:0};
    return{id,name,media,crm};
  }).sort((a,b)=>b.media.spend-a.media.spend);
  const ads=isAxven?Array.from(new Map(metaRows.map(r=>[r.ad_id,r.ad_name||r.ad_id])).entries()).map(([id,name])=>({id,name,media:summarizeMeta(metaRows.filter(r=>r.ad_id===id)),crm:summarizeAxvenCrm(filterAxvenByAttribution(filteredAxven,campaignId,id),bookings,timeline)})).sort((a,b)=>b.media.spend-a.media.spend):[];
  const byClient=clients.filter(c=>selectedClient==="all"||c.id===selectedClient).map(client=>({client,media:summarizeMeta(metaRows.filter(r=>r.cliente_id===client.id)),crm:summarizeCrm(crmRows.filter(r=>r.cliente_id===client.id))})).filter(r=>r.media.spend>0||r.crm.crmLeads>0).sort((a,b)=>b.media.spend-a.media.spend);

  const mediaCards:MetricData[]=[
    {label:"Investimento",value:money(media.spend,currency),help:"Meta Insights diário"},{label:"Leads Meta",value:integer(media.metaLeads),help:"Somente action_type = lead"},{label:"CPL Meta",value:money(media.cpl,currency),help:"Investimento ÷ Leads Meta"},
    {label:"Alcance acumulado",value:integer(media.reach),help:"Soma do alcance diário por anúncio"},{label:"Impressões",value:integer(media.impressions),help:"Entrega Meta"},{label:"Cliques",value:integer(media.clicks),help:"Cliques reportados"},
    {label:"CTR",value:percentage(media.ctr),help:"Cliques ÷ impressões"},{label:"CPC",value:money(media.cpc,currency),help:"Investimento ÷ cliques"},{label:"CPM",value:money(media.cpm,currency),help:"Custo por mil impressões"}
  ];
  const commercialCards:MetricData[]=isAxven?[
    {label:"Leads CRM",value:integer(crm.crmLeads),help:"Submissões persistidas"},{label:"Custo por Lead CRM",value:money(safeRatio(media.spend,crm.crmLeads)),help:"Investimento ÷ Leads CRM"},{label:"Qualificados",value:integer(crm.qualified),help:"qualificado = true"},{label:"Custo por Qualificado",value:money(safeRatio(media.spend,crm.qualified)),help:"Investimento ÷ qualificados"},
    {label:"Agendados",value:integer(crm.scheduled),help:"Data ou agendamento válido"},{label:"Custo por Agendamento",value:money(safeRatio(media.spend,crm.scheduled)),help:"Investimento ÷ agendados"},{label:"Propostas",value:integer(crm.proposals),help:"Etapa ou timeline comprovada"},{label:"Vendas",value:integer(crm.sales),help:"Valor, moeda e data válidos"},
    {label:"Custo por Venda",value:money(safeRatio(media.spend,crm.sales)),help:"Investimento ÷ vendas"},{label:"Faturamento",value:money(crm.revenue),help:"Somente vendas em BRL"},{label:"ROAS",value:multiple(roas),help:"Faturamento BRL ÷ mídia"}
  ]:[{label:"Leads CRM",value:integer(crm.crmLeads),help:"Registros recebidos"},{label:"Qualificados",value:integer(crm.qualified),help:"CRM"},{label:"Vendas",value:integer(crm.sales),help:"Etapa fechado"},{label:"Faturamento",value:money(crm.revenue),help:"Vendas em BRL"},{label:"ROAS",value:multiple(roas),help:"Faturamento CRM ÷ mídia"}];
  const funnel=isAxven?[["Lead CRM",crm.crmLeads,null],["Qualificado",crm.qualified,safeRatio(crm.qualified,crm.crmLeads)],["Agendado",crm.scheduled,safeRatio(crm.scheduled,crm.qualified)],["Proposta",crm.proposals,safeRatio(crm.proposals,crm.scheduled)],["Venda",crm.sales,safeRatio(crm.sales,crm.proposals)]] as const:[["Leads CRM",crm.crmLeads,null],["Qualificados",crm.qualified,safeRatio(crm.qualified,crm.crmLeads)],["Vendas",crm.sales,safeRatio(crm.sales,crm.qualified)]] as const;

  return <AppShell title="Dashboard Executiva" subtitle="Axven Digital · mídia Meta e resultado comercial" activeLabel="Dashboard"><div className="mx-auto max-w-[1680px] space-y-5 pb-8">
    <section className="rounded-[28px] border border-white/[0.08] bg-[#0b0d11] p-6 lg:p-8"><div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#ff7559]">Visão executiva</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-white">Mídia e receita, sem misturar conceitos.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Lead Meta representa conversões reportadas pela Meta. Lead CRM representa registros efetivamente recebidos pela operação.</p></div><form className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" method="get"><input aria-label="Data inicial" name="inicio" type="date" defaultValue={start} className="rounded-xl border border-white/10 bg-[#14161b] px-3 py-2.5 text-sm text-zinc-200"/><input aria-label="Data final" name="fim" type="date" defaultValue={end} className="rounded-xl border border-white/10 bg-[#14161b] px-3 py-2.5 text-sm text-zinc-200"/><select aria-label="Cliente" name="cliente" defaultValue={selectedClient} className="rounded-xl border border-white/10 bg-[#14161b] px-3 py-2.5 text-sm text-zinc-200"><option value="all">Todos os clientes</option>{clients.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select><select aria-label="Campanha" name="campanha" defaultValue={selectedCampaign} className="rounded-xl border border-white/10 bg-[#14161b] px-3 py-2.5 text-sm text-zinc-200"><option value="all">Todas as campanhas</option>{campaignOptions.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select><button className="rounded-xl bg-[#ff5a3c] px-4 py-2.5 text-sm font-semibold text-white sm:col-span-2 xl:col-span-4">Aplicar filtros</button></form></div><p className="mt-4 text-xs text-zinc-600">Período: {start.split("-").reverse().join("/")} a {end.split("-").reverse().join("/")}</p></section>
    <section><p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#ff7559]">Mídia Meta</p><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{mediaCards.map(m=><Metric key={m.label}{...m}/>)}</div></section>
    <section><p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#ff7559]">Comercial CRM</p><div className={`grid gap-3 sm:grid-cols-2 ${isAxven?"xl:grid-cols-4":"xl:grid-cols-5"}`}>{commercialCards.map(m=><Metric key={m.label}{...m}/>)}</div></section>
    <section className="rounded-[26px] border border-white/[0.08] bg-[#0b0d11] p-5 lg:p-6"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#ff7559]">Funil comercial</p><h2 className="mt-1 text-xl font-semibold text-white">{isAxven?"Lead CRM → Qualificado → Agendado → Proposta → Venda":"Lead CRM → Qualificado → Venda"}</h2><div className={`mt-6 grid gap-3 ${isAxven?"md:grid-cols-5":"md:grid-cols-3"}`}>{funnel.map(([label,value,conversion])=><div key={label} className="rounded-2xl border border-white/[0.07] p-5"><p className="text-sm text-zinc-400">{label}</p><p className="mt-3 text-3xl font-semibold text-white">{integer(value)}</p><p className="mt-2 text-xs text-zinc-600">{conversion===null?"Entrada do funil":`${percentage(conversion*100)} da etapa anterior`}</p></div>)}</div>{isAxven&&<p className="mt-4 text-xs text-zinc-600">Propostas exigem etapa atual ou evento real na timeline. Não inferimos proposta a partir de venda.</p>}{!isAxven&&selectedCampaign!=="all"&&<p className="mt-4 text-xs text-amber-200/70">A mídia foi filtrada por campaign_id. Para os demais clientes, a correlação comercial preserva a correspondência exata do nome da campanha.</p>}</section>
    {!isAxven&&<ClientTable rows={byClient}/>}<BreakdownTable title="Aquisição por campanha" label="Campanhas" rows={campaigns}/>{isAxven&&<BreakdownTable title="Aquisição por anúncio" label="Anúncios" rows={ads} detailed/>}
  </div></AppShell>;
}

type BreakdownRow={id:string;name:string;media:ReturnType<typeof summarizeMeta>;crm:{crmLeads:number;qualified:number;scheduled:number;proposals:number;sales:number;revenue:number}};
function BreakdownTable({title,label,rows,detailed=false}:{title:string;label:string;rows:BreakdownRow[];detailed?:boolean}){
  const headings=["Investimento","Leads Meta","Leads CRM","Qualificados","Agendados","Propostas","Vendas","Faturamento","CPL Meta","Custo/Lead CRM",...(detailed?["Custo/Qualificado","Custo/Agendamento"]:[]),"Custo/Venda","ROAS"];
  return <section className="rounded-[26px] border border-white/[0.08] bg-[#0b0d11] p-5 lg:p-6"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-600">{label}</p><h2 className="mt-1 text-xl font-semibold text-white">{title}</h2><div className="mt-5 overflow-x-auto"><table className={`w-full text-sm ${detailed?"min-w-[1400px]":"min-w-[1180px]"}`}><thead className="text-left text-xs text-zinc-600"><tr><th className="border-b border-white/[0.07] px-3 py-3 font-medium">{label.slice(0,-1)}</th>{headings.map(h=><th key={h} className="border-b border-white/[0.07] px-3 py-3 font-medium">{h}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id} className="border-b border-white/[0.05] text-zinc-300"><td className="max-w-72 px-3 py-4"><span className="block truncate font-medium text-white">{r.name}</span><span className="text-[11px] text-zinc-600">{r.id}</span></td><td className="px-3 py-4">{money(r.media.spend)}</td><td className="px-3 py-4">{integer(r.media.metaLeads)}</td><td className="px-3 py-4">{integer(r.crm.crmLeads)}</td><td className="px-3 py-4">{integer(r.crm.qualified)}</td><td className="px-3 py-4">{integer(r.crm.scheduled)}</td><td className="px-3 py-4">{integer(r.crm.proposals)}</td><td className="px-3 py-4">{integer(r.crm.sales)}</td><td className="px-3 py-4">{money(r.crm.revenue)}</td><td className="px-3 py-4">{money(r.media.cpl)}</td><td className="px-3 py-4">{money(safeRatio(r.media.spend,r.crm.crmLeads))}</td>{detailed&&<><td className="px-3 py-4">{money(safeRatio(r.media.spend,r.crm.qualified))}</td><td className="px-3 py-4">{money(safeRatio(r.media.spend,r.crm.scheduled))}</td></>}<td className="px-3 py-4">{money(safeRatio(r.media.spend,r.crm.sales))}</td><td className="px-3 py-4">{multiple(safeRatio(r.crm.revenue,r.media.spend))}</td></tr>)}</tbody></table>{!rows.length&&<p className="py-8 text-center text-sm text-zinc-600">Nenhum dado Meta sincronizado para o período.</p>}</div></section>;
}

function ClientTable({rows}:{rows:Array<{client:Client;media:ReturnType<typeof summarizeMeta>;crm:ReturnType<typeof summarizeCrm>}>}){
  return <section className="rounded-[26px] border border-white/[0.08] bg-[#0b0d11] p-5 lg:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-600">Por cliente</p><h2 className="mt-1 text-xl font-semibold text-white">Mídia e funil</h2></div><Link href="/clientes" className="text-sm text-[#ff846d]">Cliente 360 →</Link></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[980px] text-sm"><thead className="text-left text-xs text-zinc-600"><tr>{["Cliente","Investimento","Leads Meta","CPL","Leads CRM","Qualificados","Vendas","Faturamento","ROAS"].map(h=><th key={h} className="border-b border-white/[0.07] px-3 py-3 font-medium">{h}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.client.id} className="border-b border-white/[0.05] text-zinc-300"><td className="px-3 py-4 font-medium text-white">{r.client.nome}</td><td className="px-3 py-4">{money(r.media.spend)}</td><td className="px-3 py-4">{integer(r.media.metaLeads)}</td><td className="px-3 py-4">{money(r.media.cpl)}</td><td className="px-3 py-4">{integer(r.crm.crmLeads)}</td><td className="px-3 py-4">{integer(r.crm.qualified)}</td><td className="px-3 py-4">{integer(r.crm.sales)}</td><td className="px-3 py-4">{money(r.crm.revenue)}</td><td className="px-3 py-4">{multiple(safeRatio(r.crm.revenue,r.media.spend))}</td></tr>)}</tbody></table>{!rows.length&&<p className="py-8 text-center text-sm text-zinc-600">Nenhum dado real para os filtros selecionados.</p>}</div></section>;
}
