// Lembrete diário dos leads parados (Painel Axven · Entrega 3). Sem imports com alias.
const DIA_MS = 24 * 60 * 60 * 1000;
const PORTAL = "https://www.axvendigital.com.br";

export function linkParados(slug: string): string {
  return `${PORTAL}/crm/${slug}?parados=1`;
}

export function textoLembrete({ nomeAtendente, nomeCliente, parados, link }: { nomeAtendente: string | null; nomeCliente: string; parados: number; link: string }): string {
  const primeiro = (nomeAtendente ?? "").trim().split(/\s+/)[0];
  const saudacao = primeiro ? `Bom dia, ${primeiro}! ☀️` : "Bom dia! ☀️";
  const quantidade = parados === 1 ? "1 lead sem atualização" : `${parados} leads sem atualização`;
  return `${saudacao}\n\nVocê tem *${quantidade}* há mais de 3 dias na ${nomeCliente}.\n\nAtualize em 2 minutos: ${link}`;
}

// Dia de Brasília no formato AAAA-MM-DD (trava de 1 lembrete por dia).
export function dataLembrete(agora: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(agora);
}

export function limiteParado(agora: Date): string {
  return new Date(agora.getTime() - 3 * DIA_MS).toISOString();
}
