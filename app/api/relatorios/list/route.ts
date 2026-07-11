import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export async function GET() {
  const [{ data: relatorios }, { data: clientes }] = await Promise.all([
    supabaseAdmin
      .from("relatorios")
      .select("id,cliente_nome,periodo_inicio,periodo_fim,criado_em")
      .order("criado_em", { ascending: false }),
    supabaseAdmin.from("clientes").select("id,nome").order("nome"),
  ]);

  return NextResponse.json({
    relatorios: relatorios ?? [],
    clientes: clientes ?? [],
  });
}
