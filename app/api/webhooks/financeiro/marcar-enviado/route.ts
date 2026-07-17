import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { validateWebhookSecret } from "@/app/lib/webhookAuth";

// Chamado pelo workflow n8n do financeiro depois de mandar um lembrete (1 dia
// antes do vencimento) ou uma cobrança (1 dia depois, sem pagamento) — marca
// a data de envio no lançamento pra não mandar a mesma mensagem de novo no
// disparo do dia seguinte.
export async function POST(req: NextRequest) {
  const authError = validateWebhookSecret(req);
  if (authError) return authError;

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "corpo invalido" }, { status: 400 });
  }

  const { financeiro_id, tipo } = body as { financeiro_id?: string; tipo?: string };

  if (!financeiro_id) {
    return NextResponse.json({ error: "financeiro_id e obrigatorio" }, { status: 400 });
  }
  if (tipo !== "lembrete" && tipo !== "cobranca") {
    return NextResponse.json({ error: "tipo deve ser lembrete ou cobranca" }, { status: 400 });
  }

  const update =
    tipo === "lembrete"
      ? { lembrete_enviado_em: new Date().toISOString() }
      : { cobranca_enviada_em: new Date().toISOString(), status: "atrasado" };

  const { data, error } = await supabaseAdmin
    .from("financeiro")
    .update(update)
    .eq("id", financeiro_id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ financeiro: data });
}
