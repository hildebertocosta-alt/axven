import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { validateWebhookSecret } from "@/app/lib/webhookAuth";
import { failureTransition, sanitizeOutboxError, validProviderMessageId } from "@/app/lib/acquisitionWhatsappOutbox";

export async function PATCH(req: NextRequest) {
  const unauthorized = validateWebhookSecret(req);
  if (unauthorized) return unauthorized;

  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const envioIniciado = body?.envio_iniciado === true;
  const sucesso = body?.sucesso === true;
  const providerMessageId = body?.provider_message_id;
  const erro = sanitizeOutboxError(body?.erro);
  if (!id) return NextResponse.json({ error: "id_obrigatorio" }, { status: 400 });
  if (envioIniciado && body?.sucesso !== undefined) return NextResponse.json({ error: "evento_invalido" }, { status: 400 });
  if (sucesso && !validProviderMessageId(providerMessageId)) return NextResponse.json({ error: "provider_message_id_invalido" }, { status: 400 });

  const agora = new Date();
  const { data: current, error: currentError } = await supabaseAdmin
    .from("aquisicao_axven_whatsapp_outbox")
    .select("id, status, tentativas, enviado_em, provider_message_id, envio_iniciado_em, revisao_necessaria")
    .eq("id", id)
    .single();

  if (currentError || !current) return NextResponse.json({ error: "item_nao_encontrado" }, { status: 404 });
  if (envioIniciado) {
    if (current.status === "processando" && current.envio_iniciado_em) {
      return NextResponse.json({ ok: true, idempotent: true, envioIniciado: true });
    }
    if (current.status !== "processando" || current.provider_message_id || current.revisao_necessaria) {
      return NextResponse.json({ error: "estado_invalido" }, { status: 409 });
    }
    const { data: started, error: startError } = await supabaseAdmin
      .from("aquisicao_axven_whatsapp_outbox")
      .update({ envio_iniciado_em: agora.toISOString(), atualizado_em: agora.toISOString() })
      .eq("id", id)
      .eq("status", "processando")
      .is("envio_iniciado_em", null)
      .is("provider_message_id", null)
      .eq("revisao_necessaria", false)
      .select("id, status, tentativas, envio_iniciado_em")
      .single();
    if (startError || !started) return NextResponse.json({ error: "estado_alterado_concorrentemente" }, { status: 409 });
    return NextResponse.json({ ok: true, idempotent: false, envioIniciado: true, item: started });
  }

  if (sucesso && current.status === "enviado" && current.provider_message_id === providerMessageId) {
    return NextResponse.json({ ok: true, idempotent: true, item: current });
  }
  if (sucesso && current.status === "enviado") return NextResponse.json({ error: "provider_message_id_conflitante" }, { status: 409 });
  if (current.status !== "processando") {
    return NextResponse.json({ error: "estado_invalido" }, { status: 409 });
  }
  if (sucesso && !current.envio_iniciado_em) return NextResponse.json({ error: "envio_nao_iniciado" }, { status: 409 });

  const transition = failureTransition(Number(current.tentativas ?? 0), agora);
  const ambiguous = !sucesso && Boolean(current.envio_iniciado_em);
  const update = sucesso
    ? { status: "enviado", enviado_em: agora.toISOString(), provider_message_id: providerMessageId, revisao_necessaria: false, ultimo_erro: null, atualizado_em: agora.toISOString() }
    : ambiguous
      ? { status: "falhou", revisao_necessaria: true, ultimo_erro: "resultado_ambiguo_provider", atualizado_em: agora.toISOString() }
      : { status: transition.status, revisao_necessaria: false, ultimo_erro: erro, disponivel_em: transition.disponivel_em, atualizado_em: agora.toISOString() };

  const { data, error } = await supabaseAdmin
    .from("aquisicao_axven_whatsapp_outbox")
    .update(update)
    .eq("id", id)
    .eq("status", "processando")
    .select("id, status, tentativas, enviado_em, provider_message_id, envio_iniciado_em, revisao_necessaria")
    .single();

  if (error || !data) return NextResponse.json({ error: "estado_alterado_concorrentemente" }, { status: 409 });
  return NextResponse.json({ ok: true, idempotent: false, ambiguous, retryExhausted: !sucesso && !ambiguous && transition.exhausted, item: data });
}
