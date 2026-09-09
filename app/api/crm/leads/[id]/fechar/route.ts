import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

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
  const valor = Number(body?.valor);
  const moeda = typeof body?.moeda === "string" ? body.moeda.trim().toUpperCase() : "BRL";
  const dataConversaoRaw = typeof body?.data_conversao === "string" ? body.data_conversao.trim() : "";

  if (!Number.isFinite(valor) || valor <= 0) {
    return NextResponse.json({ error: "valor da venda inválido" }, { status: 400 });
  }

  if (!/^[A-Z]{3}$/.test(moeda)) {
    return NextResponse.json({ error: "moeda inválida" }, { status: 400 });
  }

  const dataConversao = new Date(dataConversaoRaw);
  if (!dataConversaoRaw || Number.isNaN(dataConversao.getTime())) {
    return NextResponse.json({ error: "data da venda inválida" }, { status: 400 });
  }

  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select("id, cliente_id")
    .eq("id", leadId)
    .single();

  if (!lead || lead.cliente_id !== crmUsuario.cliente_id) {
    return NextResponse.json({ error: "lead não encontrado" }, { status: 404 });
  }

  const atualizadoEm = new Date().toISOString();
  const { data: leadAtualizado, error } = await supabaseAdmin
    .from("leads")
    .update({
      etapa: "fechado",
      valor_conversao: valor,
      moeda,
      data_conversao: dataConversao.toISOString(),
      atualizado_em: atualizadoEm,
    })
    .eq("id", leadId)
    .select("id, cliente_id, etapa, valor_conversao, moeda, data_conversao, atualizado_em")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Este endpoint registra o fechamento no CRM. Não envia CAPI aqui.
  // A conversão Meta permanece dependente da validação específica de atribuição e deduplicação.
  return NextResponse.json({ lead: leadAtualizado });
}
