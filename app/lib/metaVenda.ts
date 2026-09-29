// Evento de venda (Purchase) para a API de Conversões do Meta (Painel Axven · Entrega 3).
// Sem imports com alias, para ser testado direto com `node --test`.
import { createHash } from "node:crypto";

export type LeadVenda = {
  id: string;
  valor: number | null;
  moeda: string | null;
  dataConversao: string | null;
  leadgenId: string | null;
  ctwaclid: string | null;
  pageId: string | null;
  telefone: string | null;
  email: string | null;
};

const SETE_DIAS_MS = 7 * 24 * 60 * 60 * 1000;

export function eventIdVenda(leadId: string): string {
  return `axven_venda_${leadId}`;
}

export function hashSha256(valor: string): string {
  return createHash("sha256").update(valor.trim().toLowerCase()).digest("hex");
}

export function telefoneParaMeta(telefone: string | null): string | null {
  const digitos = (telefone ?? "").replace(/\D/g, "");
  if (digitos.length < 10) return null;
  return digitos.length <= 11 ? `55${digitos}` : digitos;
}

// O Meta recusa eventos com mais de 7 dias: nesse caso (ou sem data válida) vale o momento do envio.
function momentoDoEvento(dataConversao: string | null, agora: Date): number {
  const data = dataConversao ? new Date(dataConversao).getTime() : Number.NaN;
  const valida = !Number.isNaN(data) && data <= agora.getTime() && agora.getTime() - data <= SETE_DIAS_MS;
  return Math.floor((valida ? data : agora.getTime()) / 1000);
}

export function montarEventoVenda(
  lead: LeadVenda,
  agora: Date,
): { ok: true; evento: Record<string, unknown> } | { ok: false; motivo: "sem_valor" | "sem_identificador" } {
  const valor = Number(lead.valor ?? 0);
  if (!Number.isFinite(valor) || valor <= 0) return { ok: false, motivo: "sem_valor" };

  const comum = {
    event_name: "Purchase",
    event_time: momentoDoEvento(lead.dataConversao, agora),
    event_id: eventIdVenda(lead.id),
  };
  const valorEvento = { currency: lead.moeda || "BRL", value: Math.round(valor * 100) / 100 };

  if (lead.ctwaclid) {
    return {
      ok: true,
      evento: {
        ...comum,
        action_source: "business_messaging",
        messaging_channel: "whatsapp",
        user_data: { ctwa_clid: lead.ctwaclid, ...(lead.pageId ? { page_id: lead.pageId } : {}) },
        custom_data: valorEvento,
      },
    };
  }

  const telefone = telefoneParaMeta(lead.telefone);
  const email = lead.email?.trim() ? lead.email : null;
  const contato = {
    ...(telefone ? { ph: [hashSha256(telefone)] } : {}),
    ...(email ? { em: [hashSha256(email)] } : {}),
  };

  if (lead.leadgenId) {
    return {
      ok: true,
      evento: {
        ...comum,
        action_source: "system_generated",
        user_data: { lead_id: lead.leadgenId, ...contato },
        custom_data: { ...valorEvento, event_source: "crm", lead_event_source: "Axven CRM" },
      },
    };
  }

  if (Object.keys(contato).length === 0) return { ok: false, motivo: "sem_identificador" };
  return { ok: true, evento: { ...comum, action_source: "system_generated", user_data: contato, custom_data: valorEvento } };
}
