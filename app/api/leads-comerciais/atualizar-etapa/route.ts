import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

const ETAPAS_VALIDAS = ["novo_lead", "qualificando", "proposta_enviada", "negociacao", "fechado_ganho", "perdido"];

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const id = body?.id;
  const etapa = body?.etapa;

  if (!id) return NextResponse.json({ error: "id obrigatorio" }, { status: 400 });
  if (!ETAPAS_VALIDAS.includes(etapa)) {
    return NextResponse.json({ error: "etapa invalida" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("leads_comerciais")
    .update({ etapa, atualizado_em: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lead: data });
}
