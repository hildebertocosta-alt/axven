import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { validateWebhookSecret } from "@/app/lib/webhookAuth";

// Chamado pelo agente de IA de prospecção quando o lead comercial topa um dia/horário
// pra call. Em vez de tentar interpretar a data em texto livre e criar o compromisso
// sozinha (arriscado — pode entender errado), a IA registra a proposta como uma
// tarefa de alta prioridade pro Hildeberto confirmar e criar o compromisso manualmente
// na Agenda, com o texto exato que o lead escreveu.
export async function POST(req: NextRequest) {
  const authError = validateWebhookSecret(req);
  if (authError) return authError;

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "corpo invalido" }, { status: 400 });
  }

  const { lead_id, nome, proposta } = body as { lead_id?: string; nome?: string; proposta?: string };

  if (!lead_id) {
    return NextResponse.json({ error: "lead_id e obrigatorio" }, { status: 400 });
  }

  // Sem proposta de horário nessa mensagem: no-op silencioso (o workflow n8n chama
  // esse endpoint em toda resposta da IA, só cria tarefa quando há de fato uma proposta).
  if (!proposta || !proposta.trim()) {
    return NextResponse.json({ tarefa: null, lead_id });
  }

  const { data: tarefa, error } = await supabaseAdmin
    .from("tarefas")
    .insert({
      titulo: `Confirmar agendamento com ${nome ?? "lead"}: ${proposta}`,
      cliente_nome: nome ?? null,
      tipo: "prospeccao",
      prioridade: "alta",
    })
    .select("id, titulo")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tarefa, lead_id });
}
