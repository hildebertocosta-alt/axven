import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { validateWebhookSecret } from "@/app/lib/webhookAuth";

function soDigitos(valor: string) {
  return valor.replace(/\D/g, "");
}

// Chamado pelo agente de IA do financeiro assim que uma mensagem chega no
// WhatsApp dedicado a cobrança: devolve o cliente correspondente (se existir),
// os lançamentos financeiros recentes (valor, vencimento, status) e o
// histórico da conversa — tudo que a IA precisa pra responder sobre pagamento.
export async function GET(req: NextRequest) {
  const authError = validateWebhookSecret(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const telefone = searchParams.get("telefone");

  if (!telefone) {
    return NextResponse.json({ error: "telefone e obrigatorio" }, { status: 400 });
  }

  const telefoneNormalizado = soDigitos(telefone);

  const { data: clientes } = await supabaseAdmin
    .from("clientes")
    .select("id, nome, telefone, honorarios, dia_pagamento, status_pagamento, data_fim_contrato");

  const cliente = (clientes ?? []).find((item) => item.telefone && soDigitos(item.telefone) === telefoneNormalizado) ?? null;

  let lancamentos: { mes_referencia: string; valor: number; dia_vencimento: number; status: string }[] = [];
  let mensagens: { remetente: string; mensagem: string; criado_em: string }[] = [];

  if (cliente) {
    const [{ data: financeiro }, { data: msgs }] = await Promise.all([
      supabaseAdmin
        .from("financeiro")
        .select("mes_referencia, valor, dia_vencimento, status")
        .eq("cliente_id", cliente.id)
        .order("mes_referencia", { ascending: false })
        .limit(3),
      supabaseAdmin
        .from("financeiro_mensagens")
        .select("remetente, mensagem, criado_em")
        .eq("cliente_id", cliente.id)
        .order("criado_em", { ascending: true })
        .limit(30),
    ]);
    lancamentos = financeiro ?? [];
    mensagens = msgs ?? [];
  }

  return NextResponse.json({ cliente, lancamentos, mensagens });
}
