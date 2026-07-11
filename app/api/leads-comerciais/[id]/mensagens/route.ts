import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id obrigatorio" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("leads_comerciais_mensagens")
    .select("id, remetente, mensagem, criado_em")
    .eq("lead_id", id)
    .order("criado_em", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ mensagens: data ?? [] });
}
