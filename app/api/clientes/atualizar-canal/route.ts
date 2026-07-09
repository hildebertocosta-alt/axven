import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

const CANAIS = ["indicacao", "instagram", "whatsapp", "prospeccao_ativa", "site", "google", "outro"];

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, canal_aquisicao } = body;

  if (!id) return NextResponse.json({ error: "id obrigatorio" }, { status: 400 });
  if (!CANAIS.includes(canal_aquisicao)) {
    return NextResponse.json({ error: "canal_aquisicao invalido" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("clientes")
    .update({ canal_aquisicao })
    .eq("id", id)
    .select("id, nome, canal_aquisicao")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cliente: data });
}
