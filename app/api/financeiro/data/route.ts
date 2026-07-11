import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export async function GET() {
  const [{ data: financeiro }, { data: clientes }, { data: despesas }] = await Promise.all([
    supabaseAdmin.from("financeiro").select("*").order("dia_vencimento"),
    supabaseAdmin
      .from("clientes")
      .select("id, nome, honorarios, canal_aquisicao, status_pagamento, data_fim_contrato")
      .order("nome"),
    supabaseAdmin.from("despesas").select("*").order("data", { ascending: false }),
  ]);

  return NextResponse.json({
    financeiro: financeiro ?? [],
    clientes: clientes ?? [],
    despesas: despesas ?? [],
  });
}
