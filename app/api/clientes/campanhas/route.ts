import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

const GRAPH_VERSION = "v21.0";

type Action = { action_type?: string; value?: string };

function actionValue(actions: Action[] | undefined, types: string[]) {
  if (!actions) return 0;
  for (const type of types) {
    const found = actions.find((item) => item.action_type === type);
    if (found?.value != null) return Number(found.value) || 0;
  }
  return 0;
}

export async function GET(req: NextRequest) {
  const clienteId = req.nextUrl.searchParams.get("cliente_id");
  if (!clienteId) return NextResponse.json({ error: "cliente_id obrigatório" }, { status: 400 });

  const { data: cliente, error: clienteError } = await supabaseAdmin
    .from("clientes")
    .select("id,nome,meta_account_id")
    .eq("id", clienteId)
    .single();

  if (clienteError || !cliente) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  }

  if (!cliente.meta_account_id) {
    return NextResponse.json({ error: "Cliente sem conta Meta vinculada" }, { status: 400 });
  }

  const { data: conexao } = await supabaseAdmin
    .from("integracao_meta")
    .select("access_token")
    .order("conectado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conexao?.access_token) {
    return NextResponse.json({ error: "Nenhuma conexão Meta ativa" }, { status: 400 });
  }

  const accountId = String(cliente.meta_account_id).replace(/^act_/, "");
  const fields = [
    "id",
    "name",
    "status",
    "effective_status",
    "objective",
    "daily_budget",
    "lifetime_budget",
    "insights.date_preset(last_30d){spend,impressions,reach,clicks,ctr,cpc,actions,cost_per_action_type}",
  ].join(",");

  const params = new URLSearchParams({
    fields,
    limit: "100",
    access_token: conexao.access_token,
  });

  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/act_${accountId}/campaigns?${params.toString()}`,
    { cache: "no-store" },
  );
  const payload = await res.json();

  if (!res.ok || payload.error) {
    return NextResponse.json(
      { error: payload?.error?.message ?? "Erro ao buscar campanhas Meta" },
      { status: 502 },
    );
  }

  const campanhas = (payload.data ?? []).map((campanha: any) => {
    const insight = campanha.insights?.data?.[0] ?? null;
    const leads = actionValue(insight?.actions, [
      "lead",
      "onsite_conversion.lead_grouped",
      "offsite_conversion.fb_pixel_lead",
    ]);
    const mensagens = actionValue(insight?.actions, [
      "onsite_conversion.messaging_conversation_started_7d",
      "onsite_conversion.messaging_first_reply",
    ]);
    const spend = Number(insight?.spend ?? 0) || 0;

    return {
      id: campanha.id,
      name: campanha.name,
      status: campanha.status,
      effective_status: campanha.effective_status,
      objective: campanha.objective,
      daily_budget: campanha.daily_budget ? Number(campanha.daily_budget) / 100 : null,
      lifetime_budget: campanha.lifetime_budget ? Number(campanha.lifetime_budget) / 100 : null,
      spend,
      impressions: Number(insight?.impressions ?? 0) || 0,
      reach: Number(insight?.reach ?? 0) || 0,
      clicks: Number(insight?.clicks ?? 0) || 0,
      ctr: Number(insight?.ctr ?? 0) || 0,
      cpc: Number(insight?.cpc ?? 0) || 0,
      leads,
      mensagens,
      cpl: leads > 0 ? spend / leads : null,
    };
  });

  const resumo = campanhas.reduce(
    (acc: { investimento: number; leads: number; mensagens: number; cliques: number; impressoes: number }, item: any) => {
      acc.investimento += item.spend;
      acc.leads += item.leads;
      acc.mensagens += item.mensagens;
      acc.cliques += item.clicks;
      acc.impressoes += item.impressions;
      return acc;
    },
    { investimento: 0, leads: 0, mensagens: 0, cliques: 0, impressoes: 0 },
  );

  return NextResponse.json({
    cliente: { id: cliente.id, nome: cliente.nome, meta_account_id: cliente.meta_account_id },
    periodo: "Últimos 30 dias",
    resumo: {
      ...resumo,
      cpl: resumo.leads > 0 ? resumo.investimento / resumo.leads : null,
    },
    campanhas,
  });
}
