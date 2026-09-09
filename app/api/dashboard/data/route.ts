import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

const PAGE_SIZE = 1000;

async function fetchAllOpenTasks() {
  const tarefas: Record<string, unknown>[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabaseAdmin
      .from("tarefas")
      .select("*")
      .eq("concluido", false)
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    const page = (data ?? []) as Record<string, unknown>[];
    tarefas.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return tarefas;
}

export async function GET() {
  const mesAtual = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());

  const [{ data: clientes }, { data: financeiro }, { data: despesas }, { data: lembretes }, tarefas] =
    await Promise.all([
      supabaseAdmin
        .from("clientes")
        .select("id, nome, nicho, score, status, status_pagamento, honorarios, data_fim_contrato")
        .order("nome"),
      supabaseAdmin.from("financeiro").select("id, cliente_id, valor, dia_vencimento, status").eq("mes_referencia", mesAtual),
      supabaseAdmin.from("despesas").select("valor").eq("mes_referencia", mesAtual),
      supabaseAdmin.from("lembretes").select("*").order("criado_em", { ascending: false }),
      fetchAllOpenTasks(),
    ]);

  return NextResponse.json({
    clientes: clientes ?? [],
    financeiro: financeiro ?? [],
    despesas: despesas ?? [],
    lembretes: lembretes ?? [],
    tarefas,
  });
}
