import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export async function GET() {
  const mesAtual = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());

  const [{ data: clientes }, { data: financeiro }, { data: despesas }, { data: lembretes }, { data: tarefas }] =
    await Promise.all([
      supabaseAdmin
        .from("clientes")
        .select("id, nome, nicho, score, status, status_pagamento, honorarios, data_fim_contrato")
        .order("nome"),
      supabaseAdmin.from("financeiro").select("id, cliente_id, valor, dia_vencimento, status").eq("mes_referencia", mesAtual),
      supabaseAdmin.from("despesas").select("valor").eq("mes_referencia", mesAtual),
      supabaseAdmin.from("lembretes").select("*").order("criado_em", { ascending: false }),
      supabaseAdmin.from("tarefas").select("*").eq("concluido", false),
    ]);

  return NextResponse.json({
    clientes: clientes ?? [],
    financeiro: financeiro ?? [],
    despesas: despesas ?? [],
    lembretes: lembretes ?? [],
    tarefas: tarefas ?? [],
  });
}
