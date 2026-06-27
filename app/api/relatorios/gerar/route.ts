import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  const { cliente_id, periodo_inicio, periodo_fim } = await req.json();

  const { data: cliente } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", cliente_id)
    .single();

  if (!cliente) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });

  const tipo = cliente.nome === "Rei da Parmegiana" ? "ecommerce" : "lead";

  const metaRes = await fetch(
    `https://graph.facebook.com/v19.0/act_${cliente.meta_account_id}/insights?` +
    new URLSearchParams({
      fields: "spend,reach,clicks,actions,cost_per_action_type,purchase_roas,action_values",
      time_range: JSON.stringify({ since: periodo_inicio, until: periodo_fim }),
      access_token: process.env.META_ACCESS_TOKEN!,
    })
  );

  const metaData = await metaRes.json();
  const insight = metaData?.data?.[0];

  if (!insight) return NextResponse.json({ error: "Sem dados no período" }, { status: 400 });

  const investimento = parseFloat(insight.spend ?? "0");
  const alcance = parseInt(insight.reach ?? "0");
  const cliques = parseInt(insight.clicks ?? "0");

  const actions = insight.actions ?? [];
  const leads = parseInt(actions.find((a: any) => a.action_type === "lead")?.value ?? "0");
  const pedidos = parseInt(actions.find((a: any) => a.action_type === "omni_purchase")?.value ?? "0");

  const cpl = leads > 0 ? investimento / leads : null;
  const receita = parseFloat(insight.action_values?.find((a: any) => a.action_type === "omni_purchase")?.value ?? "0");
  const roi = investimento > 0 && receita > 0 ? receita / investimento : null;

  const { data: relatorio } = await supabase
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