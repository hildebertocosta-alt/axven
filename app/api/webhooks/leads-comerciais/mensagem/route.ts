import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { validateWebhookSecret } from "@/app/lib/webhookAuth";

const REMETENTES_VALIDOS = ["lead", "ia", "hildeberto"];

// Chamado pelo workflow n8n de prospecção a cada mensagem trocada no WhatsApp
// da Axven, pra guardar o histórico de conversa vinculado ao lead comercial certo.
export async function POST(req: NextRequest) {
  const authError = validateWebhookSecret(req);
  if (authError) return authError;

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "corpo invalido" }, { status: 400 });
  }

  const { lead_id, remetente, mensagem } = body as {
    lead_id?: string;
    remetente?: string;
    mensagem?: string;
  };

  if (!lead_id || !remetente || !mensagem) {
    return NextResponse.json({ error: "lead_id, remetente e mensagem sao obrigatorios" }, { status: 400 });
  }

  if (!REMETENTES_VALIDOS.includes(remetente)) {
    return NextResponse.json({ error: "remetente invalido" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("leads_comerciais_mensagens")
    .insert({ lead_id, remetente, mensagem })
    .select("id, lead_id, remetente, mensagem, criado_em")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabaseAdmin.from("leads_comerciais").update({ atualizado_em: new Date().toISOString() }).eq("id", lead_id);

  return NextResponse.json({ mensagem: data });
}
