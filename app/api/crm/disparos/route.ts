import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

const ETAPAS_VALIDAS = ["lead", "qualificado", "agendado", "proposta_enviada", "fechado"];

// Cria um disparo em massa (oferta) pra leads da base do cliente logado.
// Só monta a fila (tabela disparos + disparos_itens); o envio de verdade,
// aos poucos com delay de 1-3min, é feito pelo n8n chamando
// /api/webhooks/disparos/processar a cada 1 minuto.
export async function POST(req: NextRequest) {
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
  const mensagem = typeof body?.mensagem === "string" ? body.mensagem.trim() : "";
  const etapas = Array.isArray(body?.etapas) ? (body.etapas as unknown[]).filter((e) => typeof e === "string") : [];

  if (!mensagem) {
    return NextResponse.json({ error: "mensagem vazia" }, { status: 400 });
  }

  if (etapas.length === 0 || !etapas.every((e) => ETAPAS_VALIDAS.includes(e as string))) {
    return NextResponse.json({ error: "selecione ao menos uma etapa válida" }, { status: 400 });
  }

  const { data: cliente } = await supabaseAdmin
    .from("clientes")
    .select("uazapi_token")
    .eq("id", crmUsuario.cliente_id)
    .single();

  if (!cliente?.uazapi_token) {
    return NextResponse.json({ error: "WhatsApp deste cliente ainda não configurado pra envio" }, { status: 400 });
  }

  const { data: leadsAlvo, error: leadsError } = await supabaseAdmin
    .from("leads")
    .select("id, telefone")
    .eq("cliente_id", crmUsuario.cliente_id)
    .in("etapa", etapas)
    .not("telefone", "is", null);

  if (leadsError) {
    return NextResponse.json({ error: leadsError.message }, { status: 500 });
  }

  if (!leadsAlvo || leadsAlvo.length === 0) {
    return NextResponse.json({ error: "nenhum lead com telefone encontrado pra esse filtro" }, { status: 400 });
  }

  const { data: disparo, error: disparoError } = await supabaseAdmin
    .from("disparos")
    .insert({
      cliente_id: crmUsuario.cliente_id,
      mensagem,
      filtro_etapas: etapas,
      total_leads: leadsAlvo.length,
      status: "em_andamento",
      proximo_envio_em: new Date().toISOString(),
      criado_por: userData.user.id,
    })
    .select("id, mensagem, filtro_etapas, total_leads, enviados, falhas, status, criado_em")
    .single();

  if (disparoError || !disparo) {
    return NextResponse.json({ error: disparoError?.message ?? "falha ao criar disparo" }, { status: 500 });
  }

  const itens = leadsAlvo.map((lead) => ({ disparo_id: disparo.id, lead_id: lead.id }));
  const { error: itensError } = await supabaseAdmin.from("disparos_itens").insert(itens);

  if (itensError) {
    await supabaseAdmin.from("disparos").delete().eq("id", disparo.id);
    return NextResponse.json({ error: itensError.message }, { status: 500 });
  }

  return NextResponse.json({ disparo });
}
