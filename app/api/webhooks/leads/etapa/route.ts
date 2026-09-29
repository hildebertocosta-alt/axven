import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { validateWebhookSecret } from "@/app/lib/webhookAuth";
import { interpretarMudancaEtapa, paramsRpcEtapa, traduzirErroEtapa } from "@/app/lib/leadEtapas";

// Chamado pelo workflow n8n do agente de IA depois de ler a conversa de WhatsApp
// e decidir que o lead avançou de etapa no kanban. Continua aceitando as etapas
// antigas (agendado, proposta_enviada, nao_fechou, desqualificado), que viram as novas.
export async function POST(req: NextRequest) {
  const authError = validateWebhookSecret(req);
  if (authError) return authError;

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "corpo invalido" }, { status: 400 });
  }

  const leadId = typeof body.lead_id === "string" ? body.lead_id : "";
  if (!leadId || typeof body.etapa !== "string") {
    return NextResponse.json({ error: "lead_id e etapa sao obrigatorios" }, { status: 400 });
  }

  const resultado = interpretarMudancaEtapa(body);
  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.erro }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc(
    "atualizar_etapa_lead_v1",
    paramsRpcEtapa(leadId, null, resultado.pedido, "sistema", null),
  );

  if (error) {
    const falha = traduzirErroEtapa(error.message);
    return NextResponse.json({ error: falha.mensagem }, { status: falha.status });
  }

  const lead = data as { id: string; nome: string; cliente_id: string; etapa: string };
  return NextResponse.json({ lead: { id: lead.id, nome: lead.nome, cliente_id: lead.cliente_id, etapa: lead.etapa } });
}
