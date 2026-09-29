import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { ETAPA_VENDA, interpretarMudancaEtapa, paramsRpcEtapa, traduzirErroEtapa } from "@/app/lib/leadEtapas";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: leadId } = await params;

  const authHeader = req.headers.get("authorization") ?? "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "");
  if (!accessToken) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(accessToken);
  if (userError || !userData?.user) {
    return NextResponse.json({ error: "sessão inválida" }, { status: 401 });
  }

  const { data: crmUsuario } = await supabaseAdmin
    .from("crm_usuarios")
    .select("cliente_id")
    .eq("user_id", userData.user.id)
    .single();

  if (!crmUsuario) {
    return NextResponse.json({ error: "usuário sem cliente vinculado" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const resultado = interpretarMudancaEtapa({ ...(body && typeof body === "object" ? body : {}), etapa: ETAPA_VENDA });
  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.erro }, { status: 400 });
  }

  // A RPC só encontra o lead se ele for do cliente do usuário logado (p_cliente_id).
  const { data, error } = await supabaseAdmin.rpc(
    "atualizar_etapa_lead_v1",
    paramsRpcEtapa(leadId, crmUsuario.cliente_id, resultado.pedido, "portal", userData.user.id),
  );

  if (error) {
    const falha = traduzirErroEtapa(error.message);
    return NextResponse.json({ error: falha.mensagem }, { status: falha.status });
  }

  // Este endpoint registra o fechamento no CRM. Não envia CAPI aqui (entrega 3 da spec).
  const lead = data as Record<string, unknown>;
  return NextResponse.json({
    lead: {
      id: lead.id,
      cliente_id: lead.cliente_id,
      etapa: lead.etapa,
      valor_conversao: lead.valor_conversao,
      moeda: lead.moeda,
      data_conversao: lead.data_conversao,
      atualizado_em: lead.atualizado_em,
    },
  });
}
