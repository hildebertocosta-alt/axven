import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

const ETAPAS_FUNIL = [
  "novo_lead",
  "qualificando",
  "proposta_enviada",
  "negociacao",
  "fechado_ganho",
  "perdido",
] as const;

// Contagem de leads comerciais por etapa do funil, pra dar uma visão rápida
// do CRM direto no Dashboard sem precisar abrir o Pipeline.
export async function GET() {
  const { data, error } = await supabaseAdmin.from("leads_comerciais").select("etapa");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const contagem: Record<string, number> = {};
  for (const item of data ?? []) {
    contagem[item.etapa] = (contagem[item.etapa] ?? 0) + 1;
  }

  const etapas = ETAPAS_FUNIL.map((etapa) => ({ etapa, total: contagem[etapa] ?? 0 }));
  const numeroInvalido = contagem["numero_invalido"] ?? 0;

  return NextResponse.json({ etapas, numeroInvalido, total: data?.length ?? 0 });
}
