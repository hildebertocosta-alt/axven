import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/app/lib/authSession";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { interpretarMudancaEtapa, paramsRpcEtapa, traduzirErroEtapa } from "@/app/lib/leadEtapas";
import { enviarVendaAoMeta } from "@/app/lib/metaVendaServidor";

const N8N_WEBHOOK_URL = "https://n8n.hildeberto.digital/webhook/crm-lead-etapa1";
const CAMPOS_RETORNO = "id,cliente_id,etapa,pausado_ia,valor_conversao,moeda,data_conversao,motivo_perda,atualizado_em";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ clienteId: string; leadId: string }> }) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!verifySessionToken(token)) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { clienteId, leadId } = await params;
  const { data: cliente } = await supabaseAdmin
    .from("clientes")
    .select("id,nome,status_pagamento")
    .eq("id", clienteId)
    .maybeSingle();
  if (!cliente || cliente.status_pagamento === "cancelado") {
    return NextResponse.json({ error: "cliente não encontrado" }, { status: 404 });
  }

  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select("id,cliente_id,telefone,origem,etapa")
    .eq("id", leadId)
    .eq("cliente_id", clienteId)
    .maybeSingle();
  if (!lead) return NextResponse.json({ error: "lead não encontrado" }, { status: 404 });

  const body = await req.json().catch(() => null);

  if (typeof body?.pausado_ia === "boolean") {
    const { data, error } = await supabaseAdmin
      .from("leads")
      .update({ pausado_ia: body.pausado_ia, atualizado_em: new Date().toISOString() })
      .eq("id", leadId)
      .eq("cliente_id", clienteId)
      .select(CAMPOS_RETORNO)
      .single();
    if (error) return NextResponse.json({ error: "falha ao atualizar lead" }, { status: 500 });
    return NextResponse.json({ lead: data });
  }

  const resultado = interpretarMudancaEtapa(body);
  if (!resultado.ok) return NextResponse.json({ error: resultado.erro }, { status: 400 });

  const { data, error } = await supabaseAdmin.rpc(
    "atualizar_etapa_lead_v1",
    paramsRpcEtapa(leadId, clienteId, resultado.pedido, "axven", null),
  );
  if (error) {
    const falha = traduzirErroEtapa(error.message);
    return NextResponse.json({ error: falha.mensagem }, { status: falha.status });
  }

  const atualizado = data as { etapa: string };
  if (atualizado.etapa === "fechado") {
    await enviarVendaAoMeta(leadId);
  }
  if (atualizado.etapa !== lead.etapa) {
    await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({
        lead_id: lead.id,
        cliente_id: lead.cliente_id,
        cliente_nome: cliente.nome,
        etapa_anterior: lead.etapa,
        etapa_nova: atualizado.etapa,
        telefone: lead.telefone,
        origem: lead.origem,
      }),
    }).catch(() => console.error("Falha ao notificar mudança de etapa."));
  }

  return NextResponse.json({ lead: data });
}
