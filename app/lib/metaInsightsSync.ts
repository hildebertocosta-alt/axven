import "server-only";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { META_GRAPH_VERSION, normalizeDailyAdInsight, type DailyAdInsight } from "@/app/lib/metaInsightsData";

const MAX_PAGES = 50;

async function metaJson<T>(url: URL, token: string): Promise<T> {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  const payload = await response.json();
  if (!response.ok || payload.error) throw new Error("Falha sanitizada ao consultar Meta Ads");
  return payload as T;
}

export async function syncMetaInsights(params: { clienteIds?: string[]; inicio: string; fim: string }) {
  const { data: connection } = await supabaseAdmin.from("integracao_meta").select("access_token,expires_at").order("conectado_em", { ascending: false }).limit(1).maybeSingle();
  if (!connection?.access_token || (connection.expires_at && new Date(connection.expires_at) <= new Date())) throw new Error("Conexão Meta indisponível");
  let clientsQuery = supabaseAdmin.from("clientes").select("id,nome,meta_account_id").not("meta_account_id", "is", null);
  if (params.clienteIds?.length) clientsQuery = clientsQuery.in("id", params.clienteIds);
  const { data: clients, error: clientsError } = await clientsQuery;
  if (clientsError) throw new Error("Falha ao carregar clientes vinculados");

  const results = [];
  for (const client of clients ?? []) {
    const accountId = client.meta_account_id as string;
    const accountUrl = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}/act_${accountId}`);
    accountUrl.searchParams.set("fields", "currency,timezone_name");
    const account = await metaJson<{ currency?: string; timezone_name?: string }>(accountUrl, connection.access_token);
    if (!account.currency || !account.timezone_name) throw new Error(`Metadados da conta indisponíveis para ${client.id}`);

    const insightsUrl = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}/act_${accountId}/insights`);
    insightsUrl.searchParams.set("fields", "campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,reach,clicks,ctr,cpc,cpm,actions");
    insightsUrl.searchParams.set("level", "ad"); insightsUrl.searchParams.set("time_increment", "1");
    insightsUrl.searchParams.set("time_range", JSON.stringify({ since: params.inicio, until: params.fim })); insightsUrl.searchParams.set("limit", "500");
    const rows: DailyAdInsight[] = []; let next: string | null = insightsUrl.toString(); let pages = 0;
    while (next && pages < MAX_PAGES) {
      const payload: { data?: DailyAdInsight[]; paging?: { next?: string } } = await metaJson(new URL(next), connection.access_token);
      rows.push(...(payload.data ?? [])); next = payload.paging?.next ?? null; pages += 1;
    }
    if (next) throw new Error(`Paginação excedeu o limite seguro para ${client.id}`);
    const synced_at = new Date().toISOString();
    const normalized = rows.map((row) => normalizeDailyAdInsight(row, { cliente_id: client.id, meta_account_id: accountId, currency: account.currency!, account_timezone: account.timezone_name!, synced_at })).filter((row): row is NonNullable<typeof row> => Boolean(row));
    for (let index = 0; index < normalized.length; index += 500) {
      const { error } = await supabaseAdmin.from("meta_ads_insights_daily").upsert(normalized.slice(index, index + 500), { onConflict: "cliente_id,meta_account_id,metric_date,ad_id" });
      if (error) throw new Error(`Falha ao persistir métricas para ${client.id}`);
    }
    results.push({ cliente_id: client.id, cliente_nome: client.nome, rows: normalized.length, pages });
  }
  return results;
}
