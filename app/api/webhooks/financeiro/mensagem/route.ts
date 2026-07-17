import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { validateWebhookSecret } from "@/app/lib/webhookAuth";

const REMETENTES_VALIDOS = ["cliente", "ia", "hildeberto"];

// Chamado pelo workflow n8n do financeiro a cada mensagem trocada no WhatsApp
// dedicado a cobrança, pra guardar o histórico vinculado ao cliente certo.
export async function POST(req: NextRequest) {
  const authError = validateWebhookSecret(req);
  if (authError) return authError;

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "corpo invalido" }, { status: 400 });
  }

  const { cliente_id, remetente, mensagem } = body as {
    cliente_id?: string;
    remetente?: string;
    mensagem?: string;
  };

  if (!cliente_id || !remetente || !mensagem) {
    return NextResponse.json({ error: "cliente_id, remetente e mensagem sao obrigatorios" }, { status: 400 });
  }

  if (!REMETENTES_VALIDOS.includes(remetente)) {
    return NextResponse.json({ error: "remetente invalido" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("financeiro_mensagens")
    .insert({ cliente_id, remetente, mensagem })
    .select("id, cliente_id, remetente, mensagem, criado_em")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ mensagem: data });
}
