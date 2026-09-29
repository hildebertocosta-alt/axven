// Regras da aba Leads do portal (Painel Axven · Entrega 2).
// Sem imports com alias, para ser testado direto com `node --test`.

const DIA_MS = 24 * 60 * 60 * 1000;
const LIMITE_PARADO_DIAS = 3;

export type FiltroLeads = { etapa: string; soParados: boolean; anuncio: string; chegada: "todos" | "7" | "30" };

export const FILTRO_INICIAL: FiltroLeads = { etapa: "todas", soParados: false, anuncio: "todos", chegada: "todos" };

export type LeadFiltravel = { etapa: string; criado_em: string; etapa_alterada_em?: string | null; anuncio?: string | null };

export function diasParado(desde: string | null | undefined, agora: Date): number {
  if (!desde) return 0;
  const inicio = new Date(desde).getTime();
  if (Number.isNaN(inicio)) return 0;
  return Math.max(0, Math.floor((agora.getTime() - inicio) / DIA_MS));
}

export function estaParado(lead: LeadFiltravel, etapasEncerradas: Set<string>, agora: Date): boolean {
  if (etapasEncerradas.has(lead.etapa)) return false;
  return diasParado(lead.etapa_alterada_em ?? lead.criado_em, agora) > LIMITE_PARADO_DIAS;
}

export function filtrarLeads<T extends LeadFiltravel>(
  leads: T[],
  filtro: FiltroLeads,
  etapasEncerradas: Set<string>,
  agora: Date,
): T[] {
  const limiteChegada = filtro.chegada === "todos" ? null : agora.getTime() - Number(filtro.chegada) * DIA_MS;
  return leads.filter((lead) => {
    if (filtro.etapa !== "todas" && lead.etapa !== filtro.etapa) return false;
    if (filtro.anuncio !== "todos" && (lead.anuncio ?? "") !== filtro.anuncio) return false;
    if (filtro.soParados && !estaParado(lead, etapasEncerradas, agora)) return false;
    if (limiteChegada !== null && new Date(lead.criado_em).getTime() < limiteChegada) return false;
    return true;
  });
}

export function anunciosDosLeads(leads: LeadFiltravel[]): string[] {
  const nomes = new Set<string>();
  for (const lead of leads) {
    const nome = (lead.anuncio ?? "").trim();
    if (nome) nomes.add(nome);
  }
  return [...nomes].sort((a, b) => a.localeCompare(b, "pt-BR"));
}
