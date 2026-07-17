import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { validateWebhookSecret } from "@/app/lib/webhookAuth";

// Chamado pelo agente de IA do financeiro quando o cliente pergunta algo que
// a IA não tem dado pra responder sozinha (o caso mais comum: Nota Fiscal,
// que hoje é emitida manualmente, fora do sistema). Em vez de inventar uma
// resposta, a IA registra uma tarefa pro Hildeberto responder pessoalmente.
export async function POST(req: NextRequest) {
  const authError = validateWebhookSecret(req);
  if (authError) return authError;

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "corpo invalido" }, { status: 400 });
  }

  const { cliente_id, nome, assunto } = body as { cliente_id?: string; nome?: string; assunto?: string };

  if (!cliente_id || !assunto || !assunto.trim()) {
    return NextResponse.json({ error: "cliente_id e assunto sao obrigatorios" }, { status: 400 });
  }

  const { data: tarefa, error } = await supabaseAdmin
    .from("tarefas")
    .insert({
      titulo: `Responder ${nome ?? "cliente"} sobre: ${assunto.trim()}`,
      cliente_id,
      cliente_nome: nome ?? null,
      tipo: "financeiro",
      prioridade: "media",
    })
    .select("id, titulo")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tarefa });
}
