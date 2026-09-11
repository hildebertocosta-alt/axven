import "server-only";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import {
  META_GRAPH_VERSION,
  normalizeDailyAdInsight,
  type DailyAdInsight,
} from "@/app/lib/metaInsightsData";
import { deriveMetaSyncStatus, type MetaSyncStatus } from "@/app/lib/metaSyncPolicy";

const MAX_PAGES = 50;
const UPSERT_BATCH_SIZE = 500;
const STALE_RUN_MS = 2 * 60 * 60 * 1000;

type Trigger = "manual" | "cron";
type ClientRow = {
  id: string;
  nome: string;
  meta_account_id: string;
  status_pagamento: string | null;
};

export type ClientSyncResult = {
  cliente_id: string;
  cliente_nome: string;
  meta_account_id: string;
  status: "success" | "failed";
  rows: number;
  pages: number;
  erro: string | null;
};

export type MetaSyncResult = {
  run_id: string;
  status: MetaSyncStatus;
  periodo: { inicio: string; fim: string };
  clientes_tentados: number;
  clientes_atualizados: number;
  clientes_com_erro: number;
  linhas_processadas: number;
  resultados: ClientSyncResult[];
};

type SyncDependencies = {
  db: typeof supabaseAdmin;
  now: () => Date;
  fetchJson: <T>(url: URL, token: string) => Promise<T>;
};

export class MetaSyncAlreadyRunningError extends Error {
  constructor() {
    super("Sincronização já está em andamento para esta janela");
    this.name = "MetaSyncAlreadyRunningError";
  }
}

export class MetaSyncGlobalError extends Error {
  runId: string | null;

  constructor(message: string, runId: string | null = null) {
    super(message);
    this.name = "MetaSyncGlobalError";
    this.runId = runId;
  }
}

async function metaJson<T>(url: URL, token: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const payload = await response.json();
  if (!response.ok || payload.error) {
    throw new Error("Falha sanitizada ao consultar Meta Ads");
  }
  return payload as T;
}

async function syncClient(
  client: ClientRow,
  token: string,
  inicio: string,
  fim: string,
  dependencies: SyncDependencies,
) {
  const accountId = client.meta_account_id;
  const accountUrl = new URL(
    `https://graph.facebook.com/${META_GRAPH_VERSION}/act_${accountId}`,
  );
  accountUrl.searchParams.set("fields", "currency,timezone_name");
  const account = await dependencies.fetchJson<{
    currency?: string;
    timezone_name?: string;
  }>(accountUrl, token);
  if (!account.currency || !account.timezone_name) {
    throw new Error("Metadados da conta indisponíveis");
  }

  const insightsUrl = new URL(
    `https://graph.facebook.com/${META_GRAPH_VERSION}/act_${accountId}/insights`,
  );
  insightsUrl.searchParams.set(
    "fields",
    "campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,reach,clicks,ctr,cpc,cpm,actions",
  );
  insightsUrl.searchParams.set("level", "ad");
  insightsUrl.searchParams.set("time_increment", "1");
  insightsUrl.searchParams.set(
    "time_range",
    JSON.stringify({ since: inicio, until: fim }),
  );
  insightsUrl.searchParams.set("limit", "500");

  const rows: DailyAdInsight[] = [];
  let next: string | null = insightsUrl.toString();
  let pages = 0;
  while (next && pages < MAX_PAGES) {
    const payload: { data?: DailyAdInsight[]; paging?: { next?: string } } =
      await dependencies.fetchJson(new URL(next), token);
    rows.push(...(payload.data ?? []));
    next = payload.paging?.next ?? null;
    pages += 1;
  }
  if (next) throw new Error("Paginação excedeu o limite seguro");

  const syncedAt = dependencies.now().toISOString();
  const normalized = rows
    .map((row) =>
      normalizeDailyAdInsight(row, {
        cliente_id: client.id,
        meta_account_id: accountId,
        currency: account.currency!,
        account_timezone: account.timezone_name!,
        synced_at: syncedAt,
      }),
    )
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  for (let index = 0; index < normalized.length; index += UPSERT_BATCH_SIZE) {
    const { error } = await dependencies.db
      .from("meta_ads_insights_daily")
      .upsert(normalized.slice(index, index + UPSERT_BATCH_SIZE), {
        onConflict: "cliente_id,meta_account_id,metric_date,ad_id",
      });
    if (error) throw new Error("Falha ao persistir métricas");
  }
  return { rows: normalized.length, pages };
}

async function failRun(
  db: typeof supabaseAdmin,
  runId: string,
  now: Date,
  message: string,
) {
  await db
    .from("meta_ads_sync_runs")
    .update({
      status: "failed",
      finished_at: now.toISOString(),
      erro_global: message,
    })
    .eq("id", runId)
    .eq("status", "running");
}

export async function syncMetaInsights(
  params: {
    clienteIds?: string[];
    inicio: string;
    fim: string;
    trigger?: Trigger;
  },
  overrides: Partial<SyncDependencies> = {},
): Promise<MetaSyncResult> {
  const dependencies: SyncDependencies = {
    db: supabaseAdmin,
    now: () => new Date(),
    fetchJson: metaJson,
    ...overrides,
  };
  const trigger = params.trigger ?? "manual";
  const startedAt = dependencies.now();
  const staleBefore = new Date(startedAt.getTime() - STALE_RUN_MS).toISOString();

  const { error: staleRunError } = await dependencies.db
    .from("meta_ads_sync_runs")
    .update({
      status: "failed",
      finished_at: startedAt.toISOString(),
      erro_global: "Execução anterior expirou antes da conclusão",
    })
    .eq("status", "running")
    .lt("started_at", staleBefore);
  if (staleRunError) {
    throw new MetaSyncGlobalError("Falha ao verificar concorrência da sincronização");
  }

  const { data: run, error: runError } = await dependencies.db
    .from("meta_ads_sync_runs")
    .insert({
      started_at: startedAt.toISOString(),
      periodo_inicio: params.inicio,
      periodo_fim: params.fim,
      status: "running",
      origem: trigger,
    })
    .select("id")
    .single();

  if (runError?.code === "23505") throw new MetaSyncAlreadyRunningError();
  if (runError || !run) {
    throw new MetaSyncGlobalError("Falha ao iniciar auditoria da sincronização");
  }
  const runId = run.id as string;

  try {
    const { data: connection, error: connectionError } = await dependencies.db
      .from("integracao_meta")
      .select("access_token,expires_at")
      .order("conectado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (connectionError || !connection?.access_token) {
      throw new MetaSyncGlobalError("Conexão Meta indisponível", runId);
    }
    if (connection.expires_at && new Date(connection.expires_at) <= startedAt) {
      throw new MetaSyncGlobalError("Conexão Meta expirada", runId);
    }
    const connectionCheckUrl = new URL(
      `https://graph.facebook.com/${META_GRAPH_VERSION}/me`,
    );
    connectionCheckUrl.searchParams.set("fields", "id");
    try {
      await dependencies.fetchJson<{ id?: string }>(
        connectionCheckUrl,
        connection.access_token,
      );
    } catch {
      throw new MetaSyncGlobalError("Conexão Meta inválida", runId);
    }

    let clientsQuery = dependencies.db
      .from("clientes")
      .select("id,nome,meta_account_id,status_pagamento")
      .not("meta_account_id", "is", null)
      .neq("status_pagamento", "cancelado");
    if (params.clienteIds?.length) {
      clientsQuery = clientsQuery.in("id", params.clienteIds);
    }
    const { data: clients, error: clientsError } = await clientsQuery;
    if (clientsError) {
      throw new MetaSyncGlobalError("Falha ao carregar clientes aptos", runId);
    }

    const resultados: ClientSyncResult[] = [];
    for (const client of (clients ?? []) as ClientRow[]) {
      const itemStartedAt = dependencies.now();
      const { data: item, error: itemError } = await dependencies.db
        .from("meta_ads_sync_run_items")
        .insert({
          run_id: runId,
          cliente_id: client.id,
          meta_account_id: client.meta_account_id,
          status: "running",
          started_at: itemStartedAt.toISOString(),
        })
        .select("id")
        .single();
      if (itemError || !item) {
        throw new MetaSyncGlobalError("Falha ao iniciar auditoria por cliente", runId);
      }

      try {
        const result = await syncClient(
          client,
          connection.access_token,
          params.inicio,
          params.fim,
          dependencies,
        );
        const { error: itemSuccessError } = await dependencies.db
          .from("meta_ads_sync_run_items")
          .update({
            status: "success",
            paginas_processadas: result.pages,
            linhas_processadas: result.rows,
            finished_at: dependencies.now().toISOString(),
          })
          .eq("id", item.id);
        if (itemSuccessError) {
          throw new Error("Falha ao registrar auditoria do cliente");
        }
        resultados.push({
          cliente_id: client.id,
          cliente_nome: client.nome,
          meta_account_id: client.meta_account_id,
          status: "success",
          rows: result.rows,
          pages: result.pages,
          erro: null,
        });
      } catch {
        const sanitizedError = "Falha sanitizada ao sincronizar cliente";
        const { error: itemFailureError } = await dependencies.db
          .from("meta_ads_sync_run_items")
          .update({
            status: "failed",
            finished_at: dependencies.now().toISOString(),
            erro: sanitizedError,
          })
          .eq("id", item.id);
        if (itemFailureError) {
          throw new MetaSyncGlobalError(
            "Falha ao registrar auditoria do cliente",
            runId,
          );
        }
        resultados.push({
          cliente_id: client.id,
          cliente_nome: client.nome,
          meta_account_id: client.meta_account_id,
          status: "failed",
          rows: 0,
          pages: 0,
          erro: sanitizedError,
        });
      }
    }

    const clientesTentados = resultados.length;
    const clientesComErro = resultados.filter((item) => item.status === "failed").length;
    const clientesAtualizados = clientesTentados - clientesComErro;
    const linhasProcessadas = resultados.reduce((total, item) => total + item.rows, 0);
    const status = deriveMetaSyncStatus(clientesTentados, clientesComErro);

    const { error: finishError } = await dependencies.db
      .from("meta_ads_sync_runs")
      .update({
        status,
        finished_at: dependencies.now().toISOString(),
        clientes_tentados: clientesTentados,
        clientes_atualizados: clientesAtualizados,
        clientes_com_erro: clientesComErro,
        linhas_processadas: linhasProcessadas,
      })
      .eq("id", runId);
    if (finishError) {
      throw new MetaSyncGlobalError("Falha ao concluir auditoria da sincronização", runId);
    }

    return {
      run_id: runId,
      status,
      periodo: { inicio: params.inicio, fim: params.fim },
      clientes_tentados: clientesTentados,
      clientes_atualizados: clientesAtualizados,
      clientes_com_erro: clientesComErro,
      linhas_processadas: linhasProcessadas,
      resultados,
    };
  } catch (error) {
    const message =
      error instanceof MetaSyncGlobalError
        ? error.message
        : "Falha sanitizada na sincronização Meta";
    await failRun(dependencies.db, runId, dependencies.now(), message);
    if (error instanceof MetaSyncGlobalError) throw error;
    throw new MetaSyncGlobalError(message, runId);
  }
}
