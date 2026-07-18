import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { validateWebhookSecret } from "@/app/lib/webhookAuth";

// Chamado periodicamente pelo n8n: devolve os compromissos cujo horário de
// lembrete (1h antes do início) já chegou, ainda não foram lembrados e ainda
// não aconteceram — pra disparar o aviso de WhatsApp pro Hildeberto.
export async function GET(req: NextRequest) {
  const authError = validateWebhookSecret(req);
  if (authError) return authError;

  const agora = new Date();
  const limiteAviso = new Date(agora.getTime() + 60 * 60 * 1000); // dispara a partir de 1h antes

  const { data, error } = await supabaseAdmin
    .from("compromissos")
    .select("id, titulo, tipo, data_hora, duracao_minutos")
    .eq("status", "agendado")
    .is("lembrete_enviado_em", null)
    .gt("data_hora", agora.toISOString())
    .lte("data_hora", limiteAviso.toISOString());

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ compromissos: data ?? [] });
}
