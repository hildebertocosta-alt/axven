import { NextRequest, NextResponse } from "next/server";
import { syncMetaInsights } from "@/app/lib/metaInsightsSync";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const inicio = typeof body?.periodo_inicio === "string" ? body.periodo_inicio : "";
  const fim = typeof body?.periodo_fim === "string" ? body.periodo_fim : "";
  const rawClientIds = body?.cliente_ids;
  if (rawClientIds !== undefined && (!Array.isArray(rawClientIds) || rawClientIds.length < 1 || rawClientIds.length > 50 || rawClientIds.some((id: unknown) => typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)))) {
    return NextResponse.json({ error: "cliente_ids inválido" }, { status: 400 });
  }
  const clienteIds = rawClientIds as string[] | undefined;
  if (!ISO_DATE.test(inicio) || !ISO_DATE.test(fim)) return NextResponse.json({ error: "Período inválido" }, { status: 400 });
  const start = new Date(`${inicio}T00:00:00Z`), end = new Date(`${fim}T00:00:00Z`);
  const days = (end.getTime() - start.getTime()) / 86_400_000;
  if (days < 0 || days > 90) return NextResponse.json({ error: "Período deve ter no máximo 90 dias" }, { status: 400 });
  try {
    const results = await syncMetaInsights({ clienteIds, inicio, fim });
    return NextResponse.json({ ok: true, periodo: { inicio, fim }, resultados: results }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error && error.message === "Conexão Meta indisponível" ? error.message : "Falha sanitizada na sincronização Meta";
    return NextResponse.json({ error: message }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
