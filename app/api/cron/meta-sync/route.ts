import { NextRequest, NextResponse } from "next/server";
import { isValidCronAuthorization } from "@/app/lib/cronAuth";
import { calculateMetaSyncWindow } from "@/app/lib/metaSyncWindow";
import {
  MetaSyncAlreadyRunningError,
  MetaSyncGlobalError,
  syncMetaInsights,
} from "@/app/lib/metaInsightsSync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const headers = { "Cache-Control": "no-store" };
  if (!isValidCronAuthorization(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers });
  }

  const window = calculateMetaSyncWindow();
  try {
    const result = await syncMetaInsights({
      inicio: window.inicio,
      fim: window.fim,
      trigger: "cron",
    });
    return NextResponse.json({
      ok: true,
      run_id: result.run_id,
      status: result.status,
      periodo: result.periodo,
      clientes_tentados: result.clientes_tentados,
      clientes_atualizados: result.clientes_atualizados,
      clientes_com_erro: result.clientes_com_erro,
      linhas_processadas: result.linhas_processadas,
    }, { headers });
  } catch (error) {
    if (error instanceof MetaSyncAlreadyRunningError) {
      return NextResponse.json({ error: error.message }, { status: 409, headers });
    }
    const message = error instanceof MetaSyncGlobalError
      ? error.message
      : "Falha sanitizada na sincronização Meta";
    return NextResponse.json({ error: message }, { status: 502, headers });
  }
}
