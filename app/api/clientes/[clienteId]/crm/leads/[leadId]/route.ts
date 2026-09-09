import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/app/lib/authSession";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

const ETAPAS = ["lead", "qualificado", "agendado", "proposta_enviada", "fechado", "nao_fechou", "desqualificado"] as const;
const MOEDAS = ["BRL", "USD", "EUR"] as const;
const N8N_WEBHOOK_URL = "https://n8n.hildeberto.digital/webhook/crm-lead-etapa1";

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
  const update: Record<string, unknown> = { atualizado_em: new Date().toISOString() };

  if (typeof body?.pausado_ia === "boolean") {
    update.pausado_ia = body.pausado_ia;
  } else {
    const etapa = typeof body?.etapa === "string" ? body.etapa : "";
    if (!ETAPAS.includes(etapa as (typeof ETAPAS)[number])) return NextResponse.json({ error: "etapa inválida" }, { status: 400 });
    update.etapa = etapa;
    if (etapa === "fechado") {
      const valor = Number(body?.valor);
      const moeda = typeof body?.moeda === "string" ? body.moeda.trim().toUpperCase() : "BRL";
      const dataConversao = new Date(typeof body?.data_conversao === "string" ? body.data_conversao : "");
      if (!Number.isFinite(valor) || valor <= 0) return NextResponse.json({ error: "valor da venda inválido" }, { status: 400 });
      if (!MOEDAS.includes(moeda as (typeof MOEDAS)[number])) return NextResponse.json({ error: "moeda inválida" }, { status: 400 });
      if (Number.isNaN(dataConversao.getTime())) return NextResponse.json({ error: "data da venda inválida" }, { status: 400 });
      update.valor_conversao = valor;
      update.moeda = moeda;
      update.data_conversao = dataConversao.toISOString();
    }
  }

  const { data, error } = await supabaseAdmin.from("leads").update(update).eq("id", leadId).eq("cliente_id", clienteId)
    .select("id,cliente_id,etapa,pausado_ia,valor_conversao,moeda,data_conversao,atualizado_em").single();
  if (error) return NextResponse.json({ error: "falha ao atualizar lead" }, { status: 500 });

  if (typeof update.etapa === "string" && update.etapa !== lead.etapa) {
    await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({
        lead_id: lead.id,
        cliente_id: lead.cliente_id,
        cliente_nome: cliente.nome,
        etapa_anterior: lead.etapa,
        etapa_nova: update.etapa,
        telefone: lead.telefone,
        origem: lead.origem,
      }),
    }).catch(() => console.error("Falha ao notificar mudança de etapa."));
  }

  return NextResponse.json({ lead: data });
}
