import { NextRequest, NextResponse } from "next/server";
import { garantirCobrancasDoMes } from "@/app/lib/financeiroAutoGen";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const mesReferencia = body?.mes_referencia;

  if (!mesReferencia || !/^\d{4}-\d{2}$/.test(mesReferencia)) {
    return NextResponse.json({ error: "mes_referencia invalido" }, { status: 400 });
  }

  await garantirCobrancasDoMes(mesReferencia);
  return NextResponse.json({ ok: true });
}
