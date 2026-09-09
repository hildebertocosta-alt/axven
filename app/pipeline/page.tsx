import { AppShell } from "../components/dashboard/AppShell";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import { LeadsBoard, type LeadRow } from "./LeadsBoard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function moeda(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
}

export default async function PipelinePage() {
  const { data: leads, error } = await supabaseAdmin
    .from("aquisicao_axven_leads")
    .select("id, nome, whatsapp, clinica, landing_page, utm_source, utm_campaign, campaign_id, adset_id, ad_id, etapa, qualificado, agendado_em, venda_em, valor_venda, moeda, criado_em, atualizado_em")
    .order("atualizado_em", { ascending: false });

  if (error) throw new Error(`Falha ao carregar pipeline Axven: ${error.message}`);

  const pipelineLeads: LeadRow[] = (leads ?? []).map((lead) => ({
    id: lead.id,
    nome: lead.nome,
    telefone: lead.whatsapp,
    nicho: lead.clinica,
    como_chegou: lead.utm_source || lead.landing_page || "site",
    etapa: lead.etapa as LeadRow["etapa"],
    atualizado_em: lead.atualizado_em,
    pausado_ia: false,
    campanha: lead.utm_campaign,
    campaign_id: lead.campaign_id,
    adset_id: lead.adset_id,
    ad_id: lead.ad_id,
    qualificado: lead.qualificado,
    agendado_em: lead.agendado_em,
    venda_em: lead.venda_em,
    valor_venda: lead.valor_venda,
    moeda: lead.moeda,
  }));

  const total = pipelineLeads.length;
  const qualificados = pipelineLeads.filter((lead) => lead.qualificado || lead.etapa === "qualificado").length;
  const agendados = pipelineLeads.filter((lead) => Boolean(lead.agendado_em) || lead.etapa === "agendado").length;
  const propostas = pipelineLeads.filter((lead) => lead.etapa === "proposta_enviada").length;
  const fechados = pipelineLeads.filter((lead) => lead.etapa === "fechado").length;
  const receita = pipelineLeads.filter((lead) => lead.etapa === "fechado").reduce((sum, lead) => sum + Number(lead.valor_venda ?? 0), 0);
  const taxa = total ? Math.round((fechados / total) * 100) : 0;

  return (
    <AppShell title="CRM Comercial" subtitle="Aquisição Axven · pipeline de crescimento" activeLabel="CRM">
      <div className="space-y-5">
        <section className="relative overflow-hidden rounded-[28px] border border-white/[0.07] bg-gradient-to-br from-[#0d0e13] via-[#0a0b0f] to-[#160d0d] p-7 lg:p-8">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#ff5a3c]/10 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#ff7458]">MÁQUINA COMERCIAL</p>
              <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-[-0.04em] text-white lg:text-4xl">Pipeline Axven em tempo real.</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-500">Da entrada do lead ao fechamento, com qualificação, agenda, proposta e receita comercial no mesmo fluxo.</p>
            </div>
            <div className="rounded-2xl border border-[#ff5a3c]/20 bg-[#ff5a3c]/[0.06] px-5 py-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">Receita fechada</p>
              <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-white">{moeda(receita)}</p>
            </div>
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {[
            ["Leads", total],
            ["Qualificados", qualificados],
            ["Agendados", agendados],
            ["Propostas", propostas],
            ["Fechados", fechados],
            ["Conversão", `${taxa}%`],
          ].map(([label, value], index) => (
            <div key={String(label)} className={`rounded-2xl border p-4 ${index === 4 ? "border-emerald-500/20 bg-emerald-500/[0.055]" : index === 5 ? "border-[#ff5a3c]/20 bg-[#ff5a3c]/[0.055]" : "border-white/[0.07] bg-[#0d0e13]"}`}>
              <p className="text-[10px] text-zinc-600">{label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">{value}</p>
            </div>
          ))}
        </div>

        <section className="rounded-[24px] border border-white/[0.07] bg-[#0b0c10] p-4 lg:p-5">
          <LeadsBoard initialLeads={pipelineLeads} />
        </section>
      </div>
    </AppShell>
  );
}
