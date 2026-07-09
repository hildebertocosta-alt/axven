import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, data_fim_contrato = null } = body;

  if (!id) return NextResponse.json({ error: "id obrigatorio" }, { status: 400 });
  if (data_fim_contrato !== null && Number.isNaN(Date.parse(data_fim_contrato))) {
    return NextResponse.json({ error: "data_fim_contrato invalida" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("clientes")
    .update({ data_fim_contrato })
    .eq("id", id)
    .select("id, nome, data_fim_contrato")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cliente: data });
}
