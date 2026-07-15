import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { validateWebhookSecret } from "@/app/lib/webhookAuth";

const ETAPAS_VALIDAS = ["novo_lead", "qualificando", "proposta_enviada", "negociacao", "fechado_ganho", "perdido", "numero_invalido"];
const ESTADOS_FUNIL_VALIDOS = ["aguardando_interesse", "aguardando_trafego", "aguardando_horario", "concluido", "perdido"];

// Chamado pelo agente de IA de prospecção depois de ler a conversa de WhatsApp
// e decidir que o lead comercial avançou (ou saiu) do funil.
export async function POST(req: NextRequest) {
  const authError = validateWebhookSecret(req);
  if (authError) return authError;

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "corpo invalido" }, { status: 400 });
  }

  const { lead_id, etapa, estado_funil } = body as { lead_id?: string; etapa?: string; estado_funil?: string };

  if (!lead_id) {
    return NextResponse.json({ error: "lead_id e obrigatorio" }, { status: 400 });
  }
  if (etapa && !ETAPAS_VALIDAS.includes(etapa)) {
    return NextResponse.json({ error: "etapa invalida" }, { status: 400 });
  }
  if (estado_funil && !ESTADOS_FUNIL_VALIDOS.includes(estado_funil)) {
    return NextResponse.json({ error: "estado_funil invalido" }, { status: 400 });
  }

  const update: Record<string, string> = { atualizado_em: new Date().toISOString() };
  if (etapa) update.etapa = etapa;
  if (estado_funil) update.estado_funil = estado_funil;

  const { data: lead, error } = await supabaseAdmin
    .from("leads_comerciais")
    .update(update)
    .eq("id", lead_id)
    .select("id, nome, etapa, estado_funil")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ lead });
}
