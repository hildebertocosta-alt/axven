import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { garantirCobranca } from "@/app/lib/financeiroAutoGen";

const STATUS_VALIDOS = ["pago", "em_dia", "atrasado", "cancelado"];

function saoPauloTodayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const clienteId = body?.cliente_id;
  const mesReferencia = body?.mes_referencia;
  const novoStatus = body?.novo_status;

  if (!clienteId) return NextResponse.json({ error: "cliente_id obrigatorio" }, { status: 400 });
  if (!mesReferencia || !/^\d{4}-\d{2}$/.test(mesReferencia)) {
    return NextResponse.json({ error: "mes_referencia invalido" }, { status: 400 });
  }
  if (!STATUS_VALIDOS.includes(novoStatus)) {
    return NextResponse.json({ error: "novo_status invalido" }, { status: 400 });
  }

  const cobranca = await garantirCobranca(clienteId, mesReferencia);
  if (!cobranca) return NextResponse.json({ error: "cliente nao encontrado" }, { status: 404 });

  const dataRecebimento = novoStatus === "pago" ? saoPauloTodayKey() : null;

  const { data: financeiroAtualizado, error } = await supabaseAdmin
    .from("financeiro")
    .update({ status: novoStatus, data_recebimento: dataRecebimento })
    .eq("id", cobranca.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ financeiro: financeiroAtualizado });
}
