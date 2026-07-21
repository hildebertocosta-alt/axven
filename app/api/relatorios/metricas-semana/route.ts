import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

const GRAPH_VERSION = "v21.0";

type ClienteRow = { id: string; nome: string; meta_account_id: string | null; tipo_campanha: string | null };
type MetaAction = { action_type: string; value: string };

export async function GET() {
  const [{ data: clientes }, { data: conexao }] = await Promise.all([
    supabaseAdmin.from("clientes").select("id, nome, meta_account_id, tipo_campanha").order("nome"),
    supabaseAdmin
      .from("integracao_meta")
      .select("access_token")
      .order("conectado_em", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const accessToken = conexao?.access_token ?? process.env.META_ACCESS_TOKEN ?? null;

  if (!accessToken) {
    return NextResponse.json({ conectado: false, metricas: [] });
  }

  const metricas = await Promise.all(
    ((clientes as ClienteRow[] | null) ?? []).map(async (cliente) => {
      if (!cliente.meta_account_id) {
        return { cliente_id: cliente.id, cliente_nome: cliente.nome, semConta: true };
      }

      const tipo = cliente.tipo_campanha ?? "lead";

      const params = new URLSearchParams({
        fields: "spend,reach,clicks,impressions,frequency,actions,action_values",
        date_preset: "last_7d",
        access_token: accessToken,
      });

      try {
        const res = await fetch(
          `https://graph.facebook.com/${GRAPH_VERSION}/act_${cliente.meta_account_id}/insights?${params}`,
        );
        const data = await res.json();
        const insight = data?.data?.[0];

        if (data?.error || !insight) {
          return {
            cliente_id: cliente.id,
            cliente_nome: cliente.nome,
            erro: data?.error?.message ?? "Sem dados nos últimos 7 dias",
          };
        }

        const investimento = parseFloat(insight.spend ?? "0");
        const alcance = parseInt(insight.reach ?? "0", 10);
        const cliques = parseInt(insight.clicks ?? "0", 10);
        const impressoes = parseInt(insight.impressions ?? "0", 10);
        const frequencia = parseFloat(insight.frequency ?? "0");
        const cpm = impressoes > 0 ? (investimento / impressoes) * 1000 : null;
        const actions: MetaAction[] = insight.actions ?? [];
        const actionValues: MetaAction[] = insight.action_values ?? [];
        const leads = parseInt(actions.find((a) => a.action_type === "lead")?.value ?? "0", 10);
        const pedidos = parseInt(actions.find((a) => a.action_type === "omni_purchase")?.value ?? "0", 10);
        const cpl = leads > 0 ? investimento / leads : null;
        const receita = parseFloat(actionValues.find((a) => a.action_type === "omni_purchase")?.value ?? "0");
        const roi = investimento > 0 && receita > 0 ? receita / investimento : null;

        return {
          cliente_id: cliente.id,
          cliente_nome: cliente.nome,
          tipo,
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
        };
      } catch {
        return { cliente_id: cliente.id, cliente_nome: cliente.nome, erro: "Falha ao consultar a Meta" };
      }
    }),
  );

  return NextResponse.json({ conectado: true, metricas });
}
