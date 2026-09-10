export type LeadRow = {
  cliente_id: string;
  etapa: string | null;
  qualificado: boolean | null;
  valor_conversao: number | string | null;
  moeda: string | null;
};

export type ReportRow = {
  cliente_id: string;
  investimento: number | string | null;
  leads: number | null;
  receita: number | string | null;
  criado_em: string;
};

const QUALIFIED_STAGES = new Set(["qualificado", "agendado", "proposta_enviada", "fechado"]);

export function summarizeLeads(leads: LeadRow[]) {
  const total = leads.length;
  const qualificados = leads.filter((lead) => lead.qualificado || QUALIFIED_STAGES.has(lead.etapa ?? "")).length;
  const vendas = leads.filter((lead) => lead.etapa === "fechado").length;
  const faturamento = leads
    .filter((lead) => lead.etapa === "fechado" && (lead.moeda ?? "BRL") === "BRL")
    .reduce((sum, lead) => sum + Number(lead.valor_conversao ?? 0), 0);
  return { total, qualificados, vendas, faturamento };
}

export function latestReportPerClient(reports: ReportRow[]) {
  const latest = new Map<string, ReportRow>();
  for (const report of reports) {
    const current = latest.get(report.cliente_id);
    if (!current || new Date(report.criado_em) > new Date(current.criado_em)) latest.set(report.cliente_id, report);
  }
  return latest;
}

export function summarizeReports(reports: ReportRow[]) {
  const investimento = reports.reduce((sum, report) => sum + Number(report.investimento ?? 0), 0);
  const leadsMeta = reports.reduce((sum, report) => sum + Number(report.leads ?? 0), 0);
  const receitaReportada = reports.reduce((sum, report) => sum + Number(report.receita ?? 0), 0);
  return {
    investimento,
    cpl: leadsMeta > 0 ? investimento / leadsMeta : null,
    roas: investimento > 0 && receitaReportada > 0 ? receitaReportada / investimento : null,
  };
}
