import { supabaseAdmin } from "./supabaseAdmin";

const DIA_VENCIMENTO_PADRAO = 5;

type ClienteFinanceiro = {
  id: string;
  honorarios: number | string | null;
  dia_pagamento: number | null;
};

function buildCobranca(cliente: ClienteFinanceiro, mesReferencia: string) {
  return {
    cliente_id: cliente.id,
    mes_referencia: mesReferencia,
    valor: Number(cliente.honorarios ?? 0),
    dia_vencimento: cliente.dia_pagamento ?? DIA_VENCIMENTO_PADRAO,
    status: "pendente" as const,
  };
}

async function clientesAtivosParaCobranca() {
  const { data } = await supabaseAdmin
    .from("clientes")
    .select("id, honorarios, dia_pagamento, status_pagamento")
    .neq("status_pagamento", "cancelado");

  return (data ?? []).filter((cliente) => Number(cliente.honorarios ?? 0) > 0) as ClienteFinanceiro[];
}

/**
 * Garante que todo cliente ativo tenha um lançamento em `financeiro` para o
 * mês informado, criando os que estiverem faltando. Não duplica nem altera
 * lançamentos já existentes.
 */
export async function garantirCobrancasDoMes(mesReferencia: string) {
  const ativos = await clientesAtivosParaCobranca();
  if (!ativos.length) return;

  const { data: existentes } = await supabaseAdmin
    .from("financeiro")
    .select("cliente_id")
    .eq("mes_referencia", mesReferencia);

  const jaTem = new Set((existentes ?? []).map((item) => item.cliente_id));
  const faltantes = ativos.filter((cliente) => !jaTem.has(cliente.id));
  if (!faltantes.length) return;

  await supabaseAdmin.from("financeiro").insert(faltantes.map((cliente) => buildCobranca(cliente, mesReferencia)));
}

/**
 * Garante que um cliente específico tenha um lançamento para o mês
 * informado, criando-o (com status "pendente") se ainda não existir.
 * Retorna o lançamento existente ou recém-criado.
 */
export async function garantirCobranca(clienteId: string, mesReferencia: string) {
  const { data: existente } = await supabaseAdmin
    .from("financeiro")
    .select("*")
    .eq("cliente_id", clienteId)
    .eq("mes_referencia", mesReferencia)
    .maybeSingle();

  if (existente) return existente;

  const { data: cliente } = await supabaseAdmin
    .from("clientes")
    .select("id, honorarios, dia_pagamento")
    .eq("id", clienteId)
    .single();

  if (!cliente) return null;

  const { data: criado, error } = await supabaseAdmin
    .from("financeiro")
    .insert(buildCobranca(cliente as ClienteFinanceiro, mesReferencia))
    .select("*")
    .single();

  if (!error) return criado;

  // condição de corrida: outra chamada já criou o registro entre o select e o insert
  const { data: retry } = await supabaseAdmin
    .from("financeiro")
    .select("*")
    .eq("cliente_id", clienteId)
    .eq("mes_referencia", mesReferencia)
    .single();

  return retry ?? null;
}
