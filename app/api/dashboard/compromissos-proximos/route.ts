import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

// Compromissos de hoje e amanhã (próximas 48h), pra aparecer no Dashboard
// assim que o Hildeberto abrir a página — sem precisar entrar na Agenda.
export async function GET() {
  const agora = new Date();
  const limite = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { data, error } = await supabaseAdmin
    .from("compromissos")
    .select("id, titulo, tipo, data_hora, duracao_minutos, status")
    .eq("status", "agendado")
    .gte("data_hora", agora.toISOString())
    .lte("data_hora", limite.toISOString())
    .order("data_hora", { ascending: true })
    .limit(10);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ compromissos: data ?? [] });
}
