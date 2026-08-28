import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Cliente não informado" }, { status: 400 });

  const { data: cliente, error } = await supabaseAdmin.from("clientes").select("*").eq("id", id).single();
  if (error || !cliente) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  if (cliente.status_pagamento === "cancelado") return NextResponse.json({ error: "Cliente fora da carteira ativa" }, { status: 403 });

  const [{ data: financeiro }, { data: tarefas }, { data: documentos }] = await Promise.all([
    supabaseAdmin.from("financeiro").select("*").eq("cliente_id", id).order("mes_referencia", { ascending: false }).limit(12),
    supabaseAdmin.from("tarefas").select("*").eq("cliente_id", id).order("criado_em", { ascending: false }).limit(20),
    supabaseAdmin.from("documentos").select("*").eq("cliente_id", id).order("criado_em", { ascending: false }).limit(50),
  ]);

  return NextResponse.json({ cliente, financeiro: financeiro ?? [], tarefas: tarefas ?? [], documentos: documentos ?? [] });
}
