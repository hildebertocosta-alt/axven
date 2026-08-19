import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const id = body?.id;
  const valor = body?.valor;
  const diaVencimento = body?.dia_vencimento;

  if (!id) return NextResponse.json({ error: "id obrigatorio" }, { status: 400 });

  const update: Record<string, number> = {};

  if (valor !== undefined) {
    const valorNumero = Number(valor);
    if (Number.isNaN(valorNumero) || valorNumero < 0) {
      return NextResponse.json({ error: "valor invalido" }, { status: 400 });
    }
    update.valor = valorNumero;
  }

  if (diaVencimento !== undefined) {
    const dia = Number(diaVencimento);
    if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
      return NextResponse.json({ error: "dia_vencimento invalido" }, { status: 400 });
    }
    update.dia_vencimento = dia;
  }

  if (!Object.keys(update).length) {
    return NextResponse.json({ error: "nada para atualizar" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("financeiro")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ financeiro: data });
}
