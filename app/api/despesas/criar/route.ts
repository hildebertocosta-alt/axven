import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { descricao, categoria = null, valor, data = null, mes_referencia, cliente_id = null } = body;

  if (!descricao?.trim()) return NextResponse.json({ error: "descricao obrigatoria" }, { status: 400 });
  if (typeof valor !== "number" || Number.isNaN(valor) || valor <= 0) {
    return NextResponse.json({ error: "valor invalido" }, { status: 400 });
  }
  if (!mes_referencia) return NextResponse.json({ error: "mes_referencia obrigatorio" }, { status: 400 });

  const { data: despesa, error } = await supabaseAdmin
    .from("despesas")
    .insert({
      descricao: descricao.trim(),
      categoria,
      valor,
      data,
      mes_referencia,
      cliente_id,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ despesa });
}
