import { NextRequest, NextResponse } from "next/server";
import {
  MetaSyncAlreadyRunningError,
  MetaSyncGlobalError,
  syncMetaInsights,
} from "@/app/lib/metaInsightsSync";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const inicio = typeof body?.periodo_inicio === "string" ? body.periodo_inicio : "";
  const fim = typeof body?.periodo_fim === "string" ? body.periodo_fim : "";
  const rawClientIds = body?.cliente_ids;
  if (
    rawClientIds !== undefined &&
    (!Array.isArray(rawClientIds) ||
      rawClientIds.length < 1 ||
      rawClientIds.length > 50 ||
      rawClientIds.some(
        (id: unknown) =>
          typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id),
      ))
  ) {
    return NextResponse.json({ error: "cliente_ids inválido" }, { status: 400 });
  }
  const clienteIds = rawClientIds as string[] | undefined;
  if (!ISO_DATE.test(inicio) || !ISO_DATE.test(fim)) {
    return NextResponse.json({ error: "Período inválido" }, { status: 400 });
  }
  const start = new Date(`${inicio}T00:00:00Z`);
  const end = new Date(`${fim}T00:00:00Z`);
  const days = (end.getTime() - start.getTime()) / 86_400_000;
  if (days < 0 || days > 90) {
    return NextResponse.json(
      { error: "Período deve ter no máximo 90 dias" },
      { status: 400 },
    );
  }

  try {
    const result = await syncMetaInsights({
      clienteIds,
      inicio,
      fim,
      trigger: "manual",
    });
    return NextResponse.json(
      {
        ok: true,
        periodo: result.periodo,
        resultados: result.resultados,
        resumo: {
          run_id: result.run_id,
          status: result.status,
          clientes_tentados: result.clientes_tentados,
          clientes_atualizados: result.clientes_atualizados,
          clientes_com_erro: result.clientes_com_erro,
          linhas_processadas: result.linhas_processadas,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof MetaSyncAlreadyRunningError) {
      return NextResponse.json(
        { error: error.message },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }
    const message =
      error instanceof MetaSyncGlobalError
        ? error.message
        : "Falha sanitizada na sincronização Meta";
    return NextResponse.json(
      { error: message },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
