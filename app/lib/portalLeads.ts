// Regras da aba Leads do portal (Painel Axven · Entrega 2).
// Sem imports com alias, para ser testado direto com `node --test`.

const DIA_MS = 24 * 60 * 60 * 1000;
const LIMITE_PARADO_DIAS = 3;

// `de` e `ate` são datas "AAAA-MM-DD" no dia de Brasília; vazias = sem limite.
export type FiltroLeads = { etapa: string; soParados: boolean; anuncio: string; chegada: "todos" | "7" | "30"; de: string; ate: string };

export const FILTRO_INICIAL: FiltroLeads = { etapa: "todas", soParados: false, anuncio: "todos", chegada: "todos", de: "", ate: "" };

const DATA = /^\d{4}-\d{2}-\d{2}$/;

function limiteDoDia(data: string | undefined, fimDoDia: boolean): number | null {
  if (!data || !DATA.test(data)) return null;
  const ms = new Date(`${data}T${fimDoDia ? "23:59:59.999" : "00:00:00"}-03:00`).getTime();
  return Number.isNaN(ms) ? null : ms;
}

const FORMATO_CHEGADA = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

// Data em que o lead chegou (no formulário, é quando a pessoa respondeu), no horário de Brasília.
export function formatarChegada(iso: string | null | undefined): string {
  if (!iso) return "—";
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "—";
  const partes = Object.fromEntries(FORMATO_CHEGADA.formatToParts(data).map((parte) => [parte.type, parte.value]));
  return `${partes.day}/${partes.month}/${partes.year} ${partes.hour}:${partes.minute}`;
}

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
  const desde = limiteDoDia(filtro.de, false);
  const ate = limiteDoDia(filtro.ate, true);
  return leads.filter((lead) => {
    if (filtro.etapa !== "todas" && lead.etapa !== filtro.etapa) return false;
    if (filtro.anuncio !== "todos" && (lead.anuncio ?? "") !== filtro.anuncio) return false;
    if (filtro.soParados && !estaParado(lead, etapasEncerradas, agora)) return false;
    const chegou = new Date(lead.criado_em).getTime();
    if (limiteChegada !== null && chegou < limiteChegada) return false;
    if (desde !== null && chegou < desde) return false;
    if (ate !== null && chegou > ate) return false;
    return true;
  });
}

// "o_tamanho_do_terreno" → "O tamanho do terreno" (o formulário do Meta grava com sublinhados).
function legivel(texto: string): string {
  const limpo = texto.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  return limpo ? limpo.charAt(0).toUpperCase() + limpo.slice(1) : "";
}

export function formatarRespostas(respostas: unknown): { pergunta: string; resposta: string }[] {
  if (!respostas || typeof respostas !== "object" || Array.isArray(respostas)) return [];
  const linhas: { pergunta: string; resposta: string }[] = [];
  for (const [chave, valor] of Object.entries(respostas as Record<string, unknown>)) {
    let resposta = "";
    if (Array.isArray(valor)) resposta = legivel(valor.map((item) => String(item ?? "")).filter(Boolean).join(", "));
    else if (typeof valor === "string") resposta = legivel(valor);
    else if (typeof valor === "number" || typeof valor === "boolean") resposta = String(valor);
    if (resposta) linhas.push({ pergunta: legivel(chave), resposta });
  }
  return linhas;
}

export function linkWhatsApp(telefone: string | null | undefined): string | null {
  const digitos = (telefone ?? "").replace(/\D/g, "");
  if (digitos.length < 10) return null;
  return `https://wa.me/${digitos.length <= 11 ? `55${digitos}` : digitos}`;
}

export function anunciosDosLeads(leads: LeadFiltravel[]): string[] {
  const nomes = new Set<string>();
  for (const lead of leads) {
    const nome = (lead.anuncio ?? "").trim();
    if (nome) nomes.add(nome);
  }
  return [...nomes].sort((a, b) => a.localeCompare(b, "pt-BR"));
}
