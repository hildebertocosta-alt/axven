import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/app/lib/authSession";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

const ETAPAS_VALIDAS = [
  "lead",
  "qualificado",
  "agendado",
  "proposta_enviada",
  "fechado",
  "nao_fechou",
  "desqualificado",
] as const;

export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!verifySessionToken(token)) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const etapa = typeof body?.etapa === "string" ? body.etapa : "";

  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  if (!ETAPAS_VALIDAS.includes(etapa as (typeof ETAPAS_VALIDAS)[number])) {
    return NextResponse.json({ error: "etapa inválida" }, { status: 400 });
  }

  const { data: atual } = await supabaseAdmin
    .from("aquisicao_axven_leads")
    .select("id, valor_venda")
    .eq("id", id)
    .maybeSingle();

  if (!atual) return NextResponse.json({ error: "lead não encontrado" }, { status: 404 });
  if (etapa === "fechado" && atual.valor_venda == null) {
    return NextResponse.json({ error: "valor da venda é obrigatório para fechar" }, { status: 409 });
  }

  const atualizadoEm = new Date().toISOString();
  const payload: Record<string, unknown> = { etapa, atualizado_em: atualizadoEm };
  if (etapa === "fechado") payload.venda_em = atualizadoEm;
  if (etapa !== "fechado") payload.venda_em = null;

  const { data, error } = await supabaseAdmin
    .from("aquisicao_axven_leads")
    .update(payload)
    .eq("id", id)
    .select("id, etapa, venda_em, valor_venda, moeda, atualizado_em")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lead: data });
}
