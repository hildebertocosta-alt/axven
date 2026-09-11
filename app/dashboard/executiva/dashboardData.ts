export const QUALIFIED_STAGES = new Set(["qualificado", "agendado", "proposta_enviada", "fechado"]);

export type MetaInsightRow = {
  cliente_id: string; campaign_id: string; campaign_name: string | null;
  spend: number | string; impressions: number | string; reach: number | string;
  clicks: number | string; leads: number | string; lead_action_type: string | null; currency: string;
};

export type CrmLeadRow = {
  cliente_id: string; etapa: string | null; qualificado: boolean | null;
  valor_conversao: number | string | null; moeda: string | null; campanha: string | null;
};

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
