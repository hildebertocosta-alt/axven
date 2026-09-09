import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

const ETAPAS_FUNIL = ["lead", "qualificado", "agendado", "proposta_enviada", "fechado", "nao_fechou", "desqualificado"] as const;

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("aquisicao_axven_leads")
    .select("etapa, qualificado, agendado_em, venda_em, valor_venda, moeda, utm_campaign, campaign_id, adset_id, ad_id, criado_em");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const leads = data ?? [];
  const contagem: Record<string, number> = {};
  let receitaFechada = 0;
  let fechados = 0;
  let qualificados = 0;
  let agendados = 0;

  for (const item of leads) {
    const etapa = item.etapa || "lead";
    contagem[etapa] = (contagem[etapa] ?? 0) + 1;
    if (item.qualificado) qualificados += 1;
    if (item.agendado_em || etapa === "agendado") agendados += 1;
    if (etapa === "fechado") {
      fechados += 1;
      if ((item.moeda ?? "BRL") === "BRL") receitaFechada += Number(item.valor_venda ?? 0);
    }
  }

  const etapas = ETAPAS_FUNIL.map((etapa) => ({ etapa, total: contagem[etapa] ?? 0 }));
  const total = leads.length;

  return NextResponse.json({
    etapas,
    total,
    qualificados,
    agendados,
    fechados,
    receitaFechada,
    taxaQualificacao: total > 0 ? (qualificados / total) * 100 : 0,
    taxaAgendamento: qualificados > 0 ? (agendados / qualificados) * 100 : 0,
    taxaFechamento: agendados > 0 ? (fechados / agendados) * 100 : 0,
  });
}
