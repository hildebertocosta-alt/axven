import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

const GRAPH_VERSION = "v21.0";
const BASE_FIELDS = [
  "spend",
  "reach",
  "impressions",
  "clicks",
  "ctr",
  "cpc",
  "cpm",
  "frequency",
  "actions",
  "cost_per_action_type",
].join(",");

const LEAD_ACTION_TYPES = new Set([
  "lead",
  "onsite_conversion.lead_grouped",
  "offsite_conversion.fb_pixel_lead",
  "onsite_conversion.messaging_conversation_started_7d",
]);

type MetaAction = { action_type?: string; value?: string };
type MetaInsight = Record<string, unknown> & {
  actions?: MetaAction[];
  spend?: string;
  reach?: string;
  impressions?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  frequency?: string;
};

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function totalLeads(actions: MetaAction[] = []) {
  return actions.reduce((total, action) => {
    if (!action.action_type || !LEAD_ACTION_TYPES.has(action.action_type)) return total;
    return total + toNumber(action.value);
  }, 0);
}

function normalizeInsight(insight: MetaInsight) {
  const investimento = toNumber(insight.spend);
  const alcance = toNumber(insight.reach);
  const impressoes = toNumber(insight.impressions);
  const cliques = toNumber(insight.clicks);
  const leads = totalLeads(insight.actions);

  return {
    ...insight,
    investimento,
    alcance,
    impressoes,
    cliques,
    ctr: toNumber(insight.ctr),
    cpc: toNumber(insight.cpc),
    cpm: toNumber(insight.cpm),
    frequencia: toNumber(insight.frequency),
    leads,
    cpl: leads > 0 ? investimento / leads : null,
  };
}

async function fetchInsights(
  accountId: string,
  accessToken: string,
  periodoInicio: string,
  periodoFim: string,
  level: "account" | "campaign" | "ad",
) {
  const fields =
    level === "campaign"
      ? `campaign_id,campaign_name,${BASE_FIELDS}`
      : level === "ad"
        ? `campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,${BASE_FIELDS}`
        : BASE_FIELDS;

  const params = new URLSearchParams({
    fields,
    level,
    time_range: JSON.stringify({ since: periodoInicio, until: periodoFim }),
    limit: "500",
    access_token: accessToken,
  });

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/act_${accountId}/insights?${params.toString()}`,
    { cache: "no-store" },
  );

  const payload = await response.json();
  if (!response.ok || payload?.error) {
    const message = payload?.error?.message ?? "Falha ao consultar Meta Ads Insights";
    throw new Error(message);
  }

  return (payload?.data ?? []).map((item: MetaInsight) => normalizeInsight(item));
}

export async function POST(req: NextRequest) {
  try {
    const { cliente_id, periodo_inicio, periodo_fim } = await req.json();

    if (!cliente_id || !periodo_inicio || !periodo_fim) {
      return NextResponse.json(
        { error: "cliente_id, periodo_inicio e periodo_fim são obrigatórios" },
        { status: 400 },
      );
    }

    const [{ data: cliente }, { data: conexaoMeta }] = await Promise.all([
      supabaseAdmin
        .from("clientes")
        .select("id,nome,meta_account_id")
        .eq("id", cliente_id)
        .single(),
      supabaseAdmin
        .from("integracao_meta")
        .select("access_token,expires_at")
        .order("conectado_em", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (!cliente) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }

    if (!cliente.meta_account_id) {
      return NextResponse.json({ error: "Cliente sem conta Meta vinculada" }, { status: 400 });
    }

    if (!conexaoMeta?.access_token) {
      return NextResponse.json({ error: "Nenhuma conexão Meta ativa" }, { status: 400 });
    }

    if (conexaoMeta.expires_at && new Date(conexaoMeta.expires_at) <= new Date()) {
      return NextResponse.json({ error: "Conexão Meta expirada; reconecte a conta" }, { status: 401 });
    }

    const [conta, campanhas, anuncios] = await Promise.all([
      fetchInsights(cliente.meta_account_id, conexaoMeta.access_token, periodo_inicio, periodo_fim, "account"),
      fetchInsights(cliente.meta_account_id, conexaoMeta.access_token, periodo_inicio, periodo_fim, "campaign"),
      fetchInsights(cliente.meta_account_id, conexaoMeta.access_token, periodo_inicio, periodo_fim, "ad"),
    ]);

    return NextResponse.json({
      fonte: "Meta Ads",
      cliente: { id: cliente.id, nome: cliente.nome, meta_account_id: cliente.meta_account_id },
      periodo: { inicio: periodo_inicio, fim: periodo_fim },
      consolidado: conta[0] ?? null,
      campanhas,
      anuncios,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
