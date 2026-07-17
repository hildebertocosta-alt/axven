import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

// Chamado pelo dashboard interno quando o Hildeberto clica em "Assumir conversa"
// (ou "Devolver pra IA") no card do lead comercial. Enquanto pausado_ia = true,
// o workflow de prospecção no n8n registra a mensagem do lead mas não responde
// com a IA, deixando o atendimento manual.
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const id = body?.id;
  const pausado = body?.pausado;

  if (!id) return NextResponse.json({ error: "id obrigatorio" }, { status: 400 });
  if (typeof pausado !== "boolean") {
    return NextResponse.json({ error: "pausado deve ser true ou false" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("leads_comerciais")
    .update({ pausado_ia: pausado, atualizado_em: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lead: data });
}
