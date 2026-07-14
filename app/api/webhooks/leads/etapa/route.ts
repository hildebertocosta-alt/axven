import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { validateWebhookSecret } from "@/app/lib/webhookAuth";

const ETAPAS_VALIDAS = ["lead", "qualificado", "agendado", "fechado"];

// Chamado pelo workflow n8n do agente de IA depois de ler a conversa de WhatsApp
// e decidir que o lead avançou de etapa no kanban.
export async function POST(req: NextRequest) {
  const authError = validateWebhookSecret(req);
  if (authError) return authError;

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "corpo invalido" }, { status: 400 });
  }

  const { lead_id, etapa } = body as { lead_id?: string; etapa?: string };

  if (!lead_id || !etapa) {
    return NextResponse.json({ error: "lead_id e etapa sao obrigatorios" }, { status: 400 });
  }

  if (!ETAPAS_VALIDAS.includes(etapa)) {
    return NextResponse.json({ error: "etapa invalida" }, { status: 400 });
  }

  const { data: lead, error } = await supabaseAdmin
    .from("leads")
    .update({ etapa, atualizado_em: new Date().toISOString() })
    .eq("id", lead_id)
    .select("id, nome, cliente_id, etapa")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ lead });
}
