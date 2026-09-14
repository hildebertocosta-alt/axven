import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { validateWebhookSecret } from "@/app/lib/webhookAuth";
import { failureTransition, sanitizeOutboxError } from "@/app/lib/acquisitionWhatsappOutbox";

export async function PATCH(req: NextRequest) {
  const unauthorized = validateWebhookSecret(req);
  if (unauthorized) return unauthorized;

  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const sucesso = body?.sucesso === true;
  const erro = sanitizeOutboxError(body?.erro);
  if (!id) return NextResponse.json({ error: "id_obrigatorio" }, { status: 400 });

  const agora = new Date();
  const { data: current, error: currentError } = await supabaseAdmin
    .from("aquisicao_axven_whatsapp_outbox")
    .select("id, status, tentativas, enviado_em")
    .eq("id", id)
    .single();

  if (currentError || !current) return NextResponse.json({ error: "item_nao_encontrado" }, { status: 404 });
  if (sucesso && current.status === "enviado") {
    return NextResponse.json({ ok: true, idempotent: true, item: current });
  }
  if (current.status !== "processando") {
    return NextResponse.json({ error: "estado_invalido" }, { status: 409 });
  }

  const transition = failureTransition(Number(current.tentativas ?? 0), agora);
  const update = sucesso
    ? { status: "enviado", enviado_em: agora.toISOString(), ultimo_erro: null, atualizado_em: agora.toISOString() }
    : { status: transition.status, ultimo_erro: erro, disponivel_em: transition.disponivel_em, atualizado_em: agora.toISOString() };

  const { data, error } = await supabaseAdmin
    .from("aquisicao_axven_whatsapp_outbox")
    .update(update)
    .eq("id", id)
    .eq("status", "processando")
    .select("id, status, tentativas, enviado_em")
    .single();

  if (error || !data) return NextResponse.json({ error: "estado_alterado_concorrentemente" }, { status: 409 });
  return NextResponse.json({ ok: true, idempotent: false, retryExhausted: !sucesso && transition.exhausted, item: data });
}
