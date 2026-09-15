export const QUALIFIED_STAGES = new Set(["qualificado", "agendado", "proposta_enviada", "fechado"]);

export type MetaInsightRow = {
  cliente_id: string; campaign_id: string; campaign_name: string | null;
  adset_id: string; adset_name: string | null; ad_id: string; ad_name: string | null;
  spend: number | string; impressions: number | string; reach: number | string;
  clicks: number | string; leads: number | string; lead_action_type: string | null; currency: string;
};

export type CrmLeadRow = {
  cliente_id: string; etapa: string | null; qualificado: boolean | null;
  valor_conversao: number | string | null; moeda: string | null; campanha: string | null;
};

export type AxvenLeadRow = {
  id: string; campaign_id: string | null; adset_id: string | null; ad_id: string | null;
  etapa: string | null; qualificado: boolean | null; agendado_em: string | null;
  venda_em: string | null; valor_venda: number | string | null; moeda: string | null;
};

export type AxvenBookingRow = { lead_id: string; status: string | null };
export type AxvenTimelineRow = { lead_id: string; etapa_nova: string | null };

const numeric = (value: number | string | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function summarizeMeta(rows: MetaInsightRow[]) {
  const spend = rows.reduce((sum, row) => sum + numeric(row.spend), 0);
  const impressions = rows.reduce((sum, row) => sum + numeric(row.impressions), 0);
  const reach = rows.reduce((sum, row) => sum + numeric(row.reach), 0);
  const clicks = rows.reduce((sum, row) => sum + numeric(row.clicks), 0);
  const metaLeads = rows.reduce((sum, row) => sum + (row.lead_action_type === "lead" ? numeric(row.leads) : 0), 0);
  const conversations = rows.reduce((sum, row) => sum + (row.lead_action_type === "onsite_conversion.messaging_conversation_started_7d" ? numeric(row.leads) : 0), 0);
  return {
    spend, impressions, reach, clicks, metaLeads, conversations,
    cpl: metaLeads > 0 ? spend / metaLeads : null,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : null,
    cpc: clicks > 0 ? spend / clicks : null,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : null,
  };
}

export function summarizeCrm(rows: CrmLeadRow[]) {
  const crmLeads = rows.length;
  const qualified = rows.filter((row) => row.qualificado || QUALIFIED_STAGES.has(row.etapa ?? "")).length;
  const sales = rows.filter((row) => row.etapa === "fechado").length;
  const revenue = rows.filter((row) => row.etapa === "fechado" && (row.moeda ?? "BRL") === "BRL").reduce((sum, row) => sum + numeric(row.valor_conversao), 0);
  return { crmLeads, qualified, sales, revenue };
}

export function filterCrmByCampaignName(rows: CrmLeadRow[], campaignName: string | null) {
  if (!campaignName) return rows;
  return rows.filter((row) => row.campanha === campaignName);
}

export function summarizeAxvenCrm(rows: AxvenLeadRow[], bookings: AxvenBookingRow[], timeline: AxvenTimelineRow[]) {
  const validBookings = new Set(bookings.filter((row) => row.status === "agendado").map((row) => row.lead_id));
  const proposalEvents = new Set(timeline.filter((row) => row.etapa_nova === "proposta_enviada").map((row) => row.lead_id));
  const qualified = rows.filter((row) => row.qualificado === true).length;
  const scheduled = rows.filter((row) => Boolean(row.agendado_em) || validBookings.has(row.id)).length;
  const proposals = rows.filter((row) => row.etapa === "proposta_enviada" || proposalEvents.has(row.id)).length;
  const validSales = rows.filter((row) => Boolean(row.venda_em) && numeric(row.valor_venda) > 0 && Boolean(row.moeda));
  const revenue = validSales.filter((row) => row.moeda === "BRL").reduce((sum, row) => sum + numeric(row.valor_venda), 0);
  return { crmLeads: rows.length, qualified, scheduled, proposals, sales: validSales.length, revenue };
}

export function safeRatio(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : null;
}

export function filterAxvenByAttribution(rows: AxvenLeadRow[], campaignId: string | null, adId: string | null = null) {
  return rows.filter((row) => (!campaignId || row.campaign_id === campaignId) && (!adId || row.ad_id === adId));
}
