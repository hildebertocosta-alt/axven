import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/app/lib/authSession";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

const ETAPAS_VALIDAS = ["lead", "qualificado", "agendado", "proposta_enviada", "fechado", "nao_fechou", "desqualificado"] as const;
const MOEDAS_VALIDAS = ["BRL", "USD", "EUR"] as const;

function rpcError(message = "") {
  if (message.includes("lead_nao_encontrado")) return ["lead não encontrado", 404] as const;
  if (message.includes("agendamento_ausente")) return ["registre um agendamento antes de mover o lead", 409] as const;
  if (message.includes("motivo_obrigatorio")) return ["motivo obrigatório", 400] as const;
  if (message.includes("valor_venda_obrigatorio")) return ["valor da venda obrigatório", 400] as const;
  if (message.includes("moeda_invalida")) return ["moeda inválida", 400] as const;
  if (message.includes("data_venda_obrigatoria")) return ["data da venda obrigatória", 400] as const;
  if (message.includes("etapa_invalida")) return ["etapa inválida", 400] as const;
  return ["não foi possível atualizar a etapa", 500] as const;
}

export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!verifySessionToken(token)) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const etapa = typeof body?.etapa === "string" ? body.etapa : "";
  const motivo = typeof body?.motivo === "string" ? body.motivo.trim().slice(0, 500) : null;

  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  if (!ETAPAS_VALIDAS.includes(etapa as (typeof ETAPAS_VALIDAS)[number])) {
    return NextResponse.json({ error: "etapa inválida" }, { status: 400 });
  }
  if ((etapa === "nao_fechou" || etapa === "desqualificado") && !motivo) {
    return NextResponse.json({ error: "motivo obrigatório" }, { status: 400 });
  }

  const valorInformado = Number(body?.valor_venda);
  const valorVenda = etapa === "fechado" && Number.isFinite(valorInformado) && valorInformado > 0
    ? Math.round(valorInformado * 100) / 100
    : null;
  const moeda = etapa === "fechado" && typeof body?.moeda === "string" && MOEDAS_VALIDAS.includes(body.moeda)
    ? body.moeda
    : null;
  const vendaDate = etapa === "fechado" && typeof body?.venda_em === "string" ? new Date(body.venda_em) : null;
  const vendaEm = vendaDate && !Number.isNaN(vendaDate.getTime()) ? vendaDate.toISOString() : null;

  if (etapa === "fechado" && (!valorVenda || !moeda || !vendaEm)) {
    return NextResponse.json({ error: "valor, moeda e data da venda são obrigatórios" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc("atualizar_etapa_aquisicao_axven_lead_v1", {
    p_lead_id: id,
    p_etapa: etapa,
    p_motivo: motivo,
    p_valor_venda: valorVenda,
    p_moeda: moeda,
    p_venda_em: vendaEm,
  });

  if (error || !data) {
    const [message, status] = rpcError(error?.message);
    return NextResponse.json({ error: message }, { status });
  }
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
