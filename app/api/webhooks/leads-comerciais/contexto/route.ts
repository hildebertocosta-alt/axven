import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { validateWebhookSecret } from "@/app/lib/webhookAuth";

function soDigitos(valor: string) {
  return valor.replace(/\D/g, "");
}

// Chamado pelo agente de IA de prospecção assim que uma mensagem chega no
// WhatsApp da Axven: devolve o lead comercial correspondente (se existir) e o
// histórico recente da conversa — tudo que a IA precisa pra decidir a resposta.
export async function GET(req: NextRequest) {
  const authError = validateWebhookSecret(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const telefone = searchParams.get("telefone");

  if (!telefone) {
    return NextResponse.json({ error: "telefone e obrigatorio" }, { status: 400 });
  }

  const telefoneNormalizado = soDigitos(telefone);

  const { data: leads } = await supabaseAdmin
    .from("leads_comerciais")
    .select("id, nome, telefone, nicho, porte, ja_investiu_trafego, etapa, estado_funil, pausado_ia");

  const lead = (leads ?? []).find((item) => item.telefone && soDigitos(item.telefone) === telefoneNormalizado) ?? null;

  let mensagens: { remetente: string; mensagem: string; criado_em: string }[] = [];
  if (lead) {
    const { data } = await supabaseAdmin
      .from("leads_comerciais_mensagens")
      .select("remetente, mensagem, criado_em")
      .eq("lead_id", lead.id)
      .order("criado_em", { ascending: true })
      .limit(30);
    mensagens = data ?? [];
  }

  return NextResponse.json({ lead, mensagens });
}
