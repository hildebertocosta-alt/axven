import { AppShell } from "../components/dashboard/AppShell";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import { LeadsBoard, type LeadRow } from "./LeadsBoard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PipelinePage() {
  const { data: leads, error } = await supabaseAdmin
    .from("aquisicao_axven_leads")
    .select(
      "id, nome, whatsapp, clinica, landing_page, utm_source, utm_campaign, campaign_id, adset_id, ad_id, etapa, qualificado, agendado_em, venda_em, valor_venda, moeda, criado_em, atualizado_em"
    )
    .order("atualizado_em", { ascending: false });

  if (error) {
    throw new Error(`Falha ao carregar pipeline Axven: ${error.message}`);
  }

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

  return (
    <AppShell
      title="CRM · Axven"
      subtitle="Pipeline comercial real · aquisição → qualificação → agenda → venda"
      activeLabel="CRM"
    >
      <LeadsBoard initialLeads={pipelineLeads} />
    </AppShell>
  );
}
