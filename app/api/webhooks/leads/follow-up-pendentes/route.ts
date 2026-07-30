import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { validateWebhookSecret } from "@/app/lib/webhookAuth";

const HORAS_PARA_FOLLOW_UP = 24;
const ETAPAS_ATIVAS = ["lead", "qualificado", "agendado"];

// Chamado pelo workflow n8n de follow-up: devolve os leads deste cliente que
// mandaram mensagem, receberam resposta (nossa ou da IA), e sumiram por mais
// de HORAS_PARA_FOLLOW_UP horas sem responder de novo - e que ainda não
// receberam o lembrete de resgate (follow_up_enviado = false).
export async function GET(req: NextRequest) {
  const authError = validateWebhookSecret(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const clienteSlug = searchParams.get("cliente_slug");

  if (!clienteSlug) {
    return NextResponse.json({ error: "cliente_slug e obrigatorio" }, { status: 400 });
  }

  const { data: cliente } = await supabaseAdmin
    .from("clientes")
    .select("id")
    .eq("slug", clienteSlug)
    .single();

  if (!cliente) {
    return NextResponse.json({ error: "cliente nao encontrado" }, { status: 404 });
  }

  const { data: candidatos } = await supabaseAdmin
    .from("leads")
    .select("id, nome, telefone")
    .eq("cliente_id", cliente.id)
    .eq("pausado_ia", false)
    .eq("follow_up_enviado", false)
    .in("etapa", ETAPAS_ATIVAS)
    .not("telefone", "is", null);

  if (!candidatos?.length) {
    return NextResponse.json({ leads: [] });
  }

  const leadIds = candidatos.map((lead) => lead.id);

  const { data: mensagens } = await supabaseAdmin
    .from("leads_mensagens")
    .select("lead_id, remetente, criado_em")
    .in("lead_id", leadIds)
    .order("criado_em", { ascending: false });

  const ultimaMensagemPorLead = new Map<string, { remetente: string; criado_em: string }>();
  for (const msg of mensagens ?? []) {
    if (!ultimaMensagemPorLead.has(msg.lead_id)) {
      ultimaMensagemPorLead.set(msg.lead_id, { remetente: msg.remetente, criado_em: msg.criado_em });
    }
  }

  const limite = Date.now() - HORAS_PARA_FOLLOW_UP * 60 * 60 * 1000;

  const pendentes = candidatos.filter((lead) => {
    const ultima = ultimaMensagemPorLead.get(lead.id);
    if (!ultima) return false;
    if (ultima.remetente === "lead") return false; // o lead falou por último, não somos nós esperando resposta
    return new Date(ultima.criado_em).getTime() <= limite;
  });

  return NextResponse.json({
    leads: pendentes.map((lead) => ({ id: lead.id, nome: lead.nome, telefone: lead.telefone })),
  });
}
