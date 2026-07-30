import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { validateWebhookSecret } from "@/app/lib/webhookAuth";

// Marca que o follow-up de resgate já foi enviado pra esse lead, pra não
// mandar de novo até ele voltar a responder (o que zera a flag em
// /api/webhooks/leads/mensagem).
export async function PATCH(req: NextRequest) {
  const authError = validateWebhookSecret(req);
  if (authError) return authError;

  const body = await req.json().catch(() => null);
  const leadId = typeof body?.lead_id === "string" ? body.lead_id : null;

  if (!leadId) {
    return NextResponse.json({ error: "lead_id e obrigatorio" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("leads").update({ follow_up_enviado: true }).eq("id", leadId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
