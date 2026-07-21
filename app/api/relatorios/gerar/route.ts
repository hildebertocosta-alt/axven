import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const { cliente_id, periodo_inicio, periodo_fim } = await req.json();

  const { data: cliente } = await supabaseAdmin
    .from("clientes")
    .select("*")
    .eq("id", cliente_id)
    .single();

  if (!cliente) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });

  const tipo = cliente.tipo_campanha ?? "lead";

  const { data: conexaoMeta } = await supabaseAdmin
    .from("integracao_meta")
    .select("access_token")
    .order("conectado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  const accessToken = conexaoMeta?.access_token ?? process.env.META_ACCESS_TOKEN!;

  const params = new URLSearchParams({
    fields: "spend,reach,clicks,impressions,frequency,actions,cost_per_action_type,purchase_roas,action_values",
    time_range: JSON.stringify({ since: periodo_inicio, until: periodo_fim }),
    access_token: accessToken,
  });

  const metaRes = await fetch(
    `https://graph.facebook.com/v21.0/act_${cliente.meta_account_id}/insights?${params}`
  );

  const metaData = await metaRes.json();
  const insight = metaData?.data?.[0];

  if (!insight) return NextResponse.json({ error: "Sem dados no período selecionado" }, { status: 400 });

  const investimento = parseFloat(insight.spend ?? "0");
  const alcance = parseInt(insight.reach ?? "0");
  const cliques = parseInt(insight.clicks ?? "0");
  const impressoes = parseInt(insight.impressions ?? "0");
  const frequencia = parseFloat(insight.frequency ?? "0");
  const cpm = impressoes > 0 ? (investimento / impressoes) * 1000 : null;

  const actions = insight.actions ?? [];
  const leads = parseInt(actions.find((a: any) => a.action_type === "lead")?.value ?? "0");
  const pedidos = parseInt(actions.find((a: any) => a.action_type === "omni_purchase")?.value ?? "0");

  const cpl = leads > 0 ? investimento / leads : null;
  const receita = parseFloat(insight.action_values?.find((a: any) => a.action_type === "omni_purchase")?.value ?? "0");
  const roi = investimento > 0 && receita > 0 ? receita / investimento : null;

  const { data: relatorio } = await supabaseAdmin
    .from("relatorios")
    .insert({
      cliente_id,
      cliente_nome: cliente.nome,
      meta_account_id: cliente.meta_account_id,
      periodo_inicio,
      periodo_fim,
      investimento,
      alcance,
      cliques,
      impressoes,
      frequencia,
      cpm,
      leads,
      cpl,
      pedidos,
      receita,
      roi,
      tipo,
    })
    .select("*")
    .single();

  return NextResponse.json({ relatorio });
}
