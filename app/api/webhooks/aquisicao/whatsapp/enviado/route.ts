import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { validateWebhookSecret } from "@/app/lib/webhookAuth";

export async function PATCH(req: NextRequest) {
  const unauthorized = validateWebhookSecret(req);
  if (unauthorized) return unauthorized;

  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const sucesso = body?.sucesso === true;
  const erro = typeof body?.erro === "string" ? body.erro.trim().slice(0, 500) : null;
  if (!id) return NextResponse.json({ error: "id_obrigatorio" }, { status: 400 });

  const agora = new Date();
  const update = sucesso
    ? { status: "enviado", enviado_em: agora.toISOString(), ultimo_erro: null, atualizado_em: agora.toISOString() }
    : { status: "falhou", ultimo_erro: erro || "falha_no_envio", disponivel_em: new Date(agora.getTime() + 5 * 60 * 1000).toISOString(), atualizado_em: agora.toISOString() };

  const { data, error } = await supabaseAdmin
    .from("aquisicao_axven_whatsapp_outbox")
    .update(update)
    .eq("id", id)
    .eq("status", "processando")
    .select("id, status, tentativas, enviado_em")
    .single();

  if (error || !data) return NextResponse.json({ error: "item_nao_encontrado_ou_estado_invalido" }, { status: 404 });
  return NextResponse.json({ ok: true, item: data });
}
