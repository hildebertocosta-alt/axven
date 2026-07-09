import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { titulo, tipo, data_hora, duracao_minutos = null } = body;

  if (!titulo?.trim()) return NextResponse.json({ error: "titulo obrigatorio" }, { status: 400 });
  if (!data_hora) return NextResponse.json({ error: "data_hora obrigatorio" }, { status: 400 });
  if (tipo !== "pessoal" && tipo !== "call_prospeccao" && tipo !== "reuniao_cliente") {
    return NextResponse.json({ error: "tipo invalido" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("compromissos")
    .insert({
      titulo: titulo.trim(),
      tipo,
      data_hora,
      duracao_minutos,
      status: "agendado",
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ compromisso: data });
}
