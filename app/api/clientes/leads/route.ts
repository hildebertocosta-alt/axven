import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const clienteId = req.nextUrl.searchParams.get("cliente_id");
  if (!clienteId) return NextResponse.json({ error: "cliente_id obrigatório" }, { status: 400 });

  const { data: cliente, error: clienteError } = await supabaseAdmin
    .from("clientes")
    .select("id,nome,status")
    .eq("id", clienteId)
    .single();

  if (clienteError || !cliente) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  if (cliente.status === "cancelado") return NextResponse.json({ error: "Cliente fora da carteira ativa" }, { status: 403 });

  const { data: leads, error } = await supabaseAdmin
    .from("leads")
    .select("id,nome,telefone,etapa,origem,campanha,conjunto,anuncio,plataforma,criado_em,atualizado_em,pausado_ia,follow_up_enviado")
    .eq("cliente_id", clienteId)
    .order("criado_em", { ascending: false })
    .limit(250);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const lista = leads ?? [];
  const agora = Date.now();
  const ha30Dias = agora - 30 * 24 * 60 * 60 * 1000;
  const ultimos30 = lista.filter((lead) => lead.criado_em && new Date(lead.criado_em).getTime() >= ha30Dias);

  const etapas = lista.reduce<Record<string, number>>((acc, lead) => {
    const etapa = lead.etapa || "sem_etapa";
    acc[etapa] = (acc[etapa] || 0) + 1;
    return acc;
  }, {});

  const origens = lista.reduce<Record<string, number>>((acc, lead) => {
    const origem = lead.origem || "Não informada";
    acc[origem] = (acc[origem] || 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    cliente: { id: cliente.id, nome: cliente.nome },
    resumo: {
      total: lista.length,
      ultimos_30_dias: ultimos30.length,
      qualificados: etapas.qualificado ?? 0,
      agendados: etapas.agendado ?? 0,
      vendas: (etapas.venda ?? 0) + (etapas.vendido ?? 0) + (etapas.convertido ?? 0),
    },
    etapas,
    origens,
    leads: lista,
  });
}
