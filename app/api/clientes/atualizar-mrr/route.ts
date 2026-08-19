import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const id = body?.id;
  const honorarios = body?.honorarios;
  const diaPagamento = body?.dia_pagamento;

  if (!id) return NextResponse.json({ error: "id obrigatorio" }, { status: 400 });

  const update: Record<string, number> = {};

  if (honorarios !== undefined) {
    const valor = Number(honorarios);
    if (Number.isNaN(valor) || valor < 0) {
      return NextResponse.json({ error: "honorarios invalido" }, { status: 400 });
    }
    update.honorarios = valor;
  }

  if (diaPagamento !== undefined) {
    const dia = Number(diaPagamento);
    if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
      return NextResponse.json({ error: "dia_pagamento invalido" }, { status: 400 });
    }
    update.dia_pagamento = dia;
  }

  if (!Object.keys(update).length) {
    return NextResponse.json({ error: "nada para atualizar" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("clientes")
    .update(update)
    .eq("id", id)
    .select("id, nome, honorarios, dia_pagamento")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cliente: data });
}
