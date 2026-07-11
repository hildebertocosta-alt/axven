import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { titulo, prioridade = "normal", cliente_id = null, cliente_nome = null } = body;
  if (!titulo?.trim()) return NextResponse.json({ error: "titulo obrigatorio" }, { status: 400 });
  const { data, error } = await supabaseAdmin.from("tarefas").insert({ titulo: titulo.trim(), prioridade, cliente_id, cliente_nome, concluido: false }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tarefa: data });
}