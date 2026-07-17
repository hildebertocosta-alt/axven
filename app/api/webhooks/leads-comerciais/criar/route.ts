import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { validateWebhookSecret } from "@/app/lib/webhookAuth";

// Chamado pelo agente de IA de prospecção quando chega mensagem no WhatsApp de
// um número que ainda não existe em leads_comerciais — o caso normal pra lead
// de tráfego pago (clicou no anúncio e mandou mensagem primeiro, nunca foi
// cadastrado antes). Cria o lead já como "contatado" pra nunca entrar na fila
// do disparo frio (que espera estado_funil = aguardando_interesse).
export async function POST(req: NextRequest) {
  const authError = validateWebhookSecret(req);
  if (authError) return authError;

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "corpo invalido" }, { status: 400 });
  }

  const { telefone, nome } = body as { telefone?: string; nome?: string };

  if (!telefone) {
    return NextResponse.json({ error: "telefone e obrigatorio" }, { status: 400 });
  }

  const { data: lead, error } = await supabaseAdmin
    .from("leads_comerciais")
    .insert({
      telefone: telefone.replace(/\D/g, ""),
      nome: nome?.trim() || null,
      como_chegou: "trafego_pago",
      etapa: "novo_lead",
      estado_funil: "contatado",
    })
    .select("id, nome, telefone, nicho, como_chegou, etapa, estado_funil")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ lead });
}
