import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

const STATUS_VALIDOS = ["pendente", "pago", "em_dia", "atrasado", "cancelado"];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const clienteId = body?.cliente_id;
  const mesReferencia = body?.mes_referencia;
  const valor = Number(body?.valor);
  const diaVencimento = Number(body?.dia_vencimento);
  const status = body?.status || "pendente";

  if (!clienteId) return NextResponse.json({ error: "cliente_id obrigatorio" }, { status: 400 });
  if (!mesReferencia || !/^\d{4}-\d{2}$/.test(mesReferencia)) {
    return NextResponse.json({ error: "mes_referencia invalido" }, { status: 400 });
  }
  if (Number.isNaN(valor) || valor <= 0) {
    return NextResponse.json({ error: "valor invalido" }, { status: 400 });
  }
  if (!Number.isInteger(diaVencimento) || diaVencimento < 1 || diaVencimento > 31) {
    return NextResponse.json({ error: "dia_vencimento invalido" }, { status: 400 });
  }
  if (!STATUS_VALIDOS.includes(status)) {
    return NextResponse.json({ error: "status invalido" }, { status: 400 });
  }

  const { data: existente } = await supabaseAdmin
    .from("financeiro")
    .select("id")
    .eq("cliente_id", clienteId)
    .eq("mes_referencia", mesReferencia)
    .maybeSingle();

  if (existente) {
    return NextResponse.json(
      { error: "Já existe uma cobrança para esse cliente nesse mês. Edite o lançamento existente." },
      { status: 409 },
    );
  }

  const dataRecebimento = status === "pago" ? new Date().toISOString().slice(0, 10) : null;

  const { data, error } = await supabaseAdmin
    .from("financeiro")
    .insert({
      cliente_id: clienteId,
      mes_referencia: mesReferencia,
      valor,
      dia_vencimento: diaVencimento,
      status,
      data_recebimento: dataRecebimento,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ financeiro: data });
}
