import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

// Envia uma mensagem manual (digitada pelo funcionário do cliente no CRM) pro
// lead via WhatsApp (Uazapi), e registra no histórico da conversa.
// Autenticação: o navegador manda o access_token da sessão Supabase do
// usuário logado (crm_usuarios); validamos aqui e conferimos que o lead
// pertence ao cliente desse usuário antes de fazer qualquer coisa.
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
  const mensagem = typeof body?.mensagem === "string" ? body.mensagem.trim() : "";
  if (!mensagem) {
    return NextResponse.json({ error: "mensagem vazia" }, { status: 400 });
  }

  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select("id, telefone, cliente_id")
    .eq("id", leadId)
    .single();

  if (!lead || lead.cliente_id !== crmUsuario.cliente_id) {
    return NextResponse.json({ error: "lead não encontrado" }, { status: 404 });
  }

  if (!lead.telefone) {
    return NextResponse.json({ error: "lead sem telefone cadastrado" }, { status: 400 });
  }

  const { data: cliente } = await supabaseAdmin
    .from("clientes")
    .select("uazapi_token")
    .eq("id", crmUsuario.cliente_id)
    .single();

  if (!cliente?.uazapi_token) {
    return NextResponse.json({ error: "WhatsApp deste cliente ainda não configurado pra envio manual" }, { status: 400 });
  }

  const envioResponse = await fetch("https://axven.uazapi.com/send/text", {
    method: "POST",
    headers: { "Content-Type": "application/json", token: cliente.uazapi_token },
    body: JSON.stringify({ number: lead.telefone, text: mensagem }),
  });

  if (!envioResponse.ok) {
    const detalhe = await envioResponse.text().catch(() => "");
    return NextResponse.json({ error: "falha ao enviar no WhatsApp", detalhe }, { status: 502 });
  }

  const { data: mensagemSalva, error: insertError } = await supabaseAdmin
    .from("leads_mensagens")
    .insert({ lead_id: leadId, remetente: "humano", mensagem })
    .select("id, remetente, mensagem, criado_em")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  await supabaseAdmin.from("leads").update({ atualizado_em: new Date().toISOString() }).eq("id", leadId);

  return NextResponse.json({ mensagem: mensagemSalva });
}
