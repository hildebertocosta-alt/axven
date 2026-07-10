import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const nome = typeof body?.nome === "string" ? body.nome.trim() : "";
  if (!nome) return NextResponse.json({ error: "nome obrigatorio" }, { status: 400 });

  const nicho = typeof body?.nicho === "string" && body.nicho.trim() ? body.nicho.trim() : null;
  const honorarios = typeof body?.honorarios === "number" && body.honorarios > 0 ? body.honorarios : null;
  const diaPagamento =
    typeof body?.dia_pagamento === "number" && body.dia_pagamento >= 1 && body.dia_pagamento <= 31
      ? body.dia_pagamento
      : 5;

  const { data, error } = await supabaseAdmin
    .from("clientes")
    .insert({ nome, nicho, honorarios, dia_pagamento: diaPagamento, status: "verificar" })
    .select("id, nome, nicho, score, status, status_pagamento, honorarios, data_fim_contrato")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cliente: data });
}
