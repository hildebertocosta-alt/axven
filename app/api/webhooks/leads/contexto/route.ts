import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { validateWebhookSecret } from "@/app/lib/webhookAuth";

// Normaliza um telefone pra comparação: só dígitos.
function soDigitos(valor: string) {
  return valor.replace(/\D/g, "");
}

// Chamado pelo workflow n8n do agente de IA assim que uma mensagem chega no
// WhatsApp do cliente: devolve o lead correspondente (se existir), os
// critérios de qualificação do cliente e o histórico recente da conversa —
// tudo que a IA precisa pra decidir se muda a etapa.
export async function GET(req: NextRequest) {
  const authError = validateWebhookSecret(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const telefone = searchParams.get("telefone");
  const clienteSlug = searchParams.get("cliente_slug");

  if (!telefone || !clienteSlug) {
    return NextResponse.json({ error: "telefone e cliente_slug sao obrigatorios" }, { status: 400 });
  }

  const { data: cliente, error: clienteError } = await supabaseAdmin
    .from("clientes")
    .select("id, criterios_qualificacao")
    .eq("slug", clienteSlug)
    .single();

  if (clienteError || !cliente) {
    return NextResponse.json({ error: "cliente nao encontrado" }, { status: 404 });
  }

  const telefoneNormalizado = soDigitos(telefone);

  const { data: leadsCliente } = await supabaseAdmin
    .from("leads")
    .select("id, nome, telefone, etapa")
    .eq("cliente_id", cliente.id);

  const lead = (leadsCliente ?? []).find((item) => item.telefone && soDigitos(item.telefone) === telefoneNormalizado) ?? null;

  let mensagens: { remetente: string; mensagem: string; criado_em: string }[] = [];
  if (lead) {
    const { data } = await supabaseAdmin
      .from("leads_mensagens")
      .select("remetente, mensagem, criado_em")
      .eq("lead_id", lead.id)
      .order("criado_em", { ascending: true })
      .limit(30);
    mensagens = data ?? [];
  }

  return NextResponse.json({
    lead,
    criterios_qualificacao: cliente.criterios_qualificacao ?? null,
    mensagens,
  });
}
