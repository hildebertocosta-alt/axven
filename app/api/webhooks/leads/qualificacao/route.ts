import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { validateWebhookSecret } from "@/app/lib/webhookAuth";

function clean(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizePhone(value: unknown) {
  const raw = clean(value);
  if (!raw) return null;
  return raw.split("@")[0]?.replace(/\D/g, "") || null;
}

export async function POST(req: NextRequest) {
  const authError = validateWebhookSecret(req);
  if (authError) return authError;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "corpo invalido" }, { status: 400 });
  }

  const clienteId = clean(body.cliente_id);
  const clienteSlug = clean(body.cliente_slug);
  const leadId = clean(body.lead_id);
  const telefone = normalizePhone(body.telefone ?? body.phone ?? body.whatsapp);
  const whatsappLid = clean(body.whatsapp_lid ?? body.lid)?.replace(/@lid$/, "") || null;
  const ctwaclid = clean(body.ctwaclid);

  if (!clienteId && !clienteSlug) {
    return NextResponse.json({ error: "informe cliente_id ou cliente_slug" }, { status: 400 });
  }

  let clienteQuery = supabaseAdmin.from("clientes").select("id,nome,status");
  if (clienteId) clienteQuery = clienteQuery.eq("id", clienteId);
  else clienteQuery = clienteQuery.eq("slug", clienteSlug!);

  const { data: cliente, error: clienteError } = await clienteQuery.maybeSingle();
  if (clienteError || !cliente) {
    return NextResponse.json({ error: "cliente nao encontrado" }, { status: 404 });
  }
  if (cliente.status === "cancelado") {
    return NextResponse.json({ error: "cliente fora da carteira ativa" }, { status: 403 });
  }

  if (!leadId && !telefone && !whatsappLid && !ctwaclid) {
    return NextResponse.json(
      { error: "informe lead_id, telefone, whatsapp_lid ou ctwaclid" },
      { status: 400 },
    );
  }

  let lead: any = null;
  if (leadId) {
    const { data } = await supabaseAdmin
      .from("leads")
      .select("id,nome,telefone,cliente_id,etapa,qualificado")
      .eq("cliente_id", cliente.id)
      .eq("id", leadId)
      .maybeSingle();
    lead = data;
  }

  if (!lead && telefone) {
    const { data } = await supabaseAdmin
      .from("leads")
      .select("id,nome,telefone,cliente_id,etapa,qualificado")
      .eq("cliente_id", cliente.id)
      .eq("telefone", telefone)
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    lead = data;
  }

  if (!lead && whatsappLid) {
    const { data } = await supabaseAdmin
      .from("leads")
      .select("id,nome,telefone,cliente_id,etapa,qualificado")
      .eq("cliente_id", cliente.id)
      .eq("whatsapp_lid", whatsappLid)
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    lead = data;
  }

  if (!lead && ctwaclid) {
    const { data } = await supabaseAdmin
      .from("leads")
      .select("id,nome,telefone,cliente_id,etapa,qualificado")
      .eq("cliente_id", cliente.id)
      .eq("ctwaclid", ctwaclid)
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    lead = data;
  }

  if (!lead) {
    return NextResponse.json({ error: "lead nao encontrado" }, { status: 404 });
  }

  const { data: atualizado, error } = await supabaseAdmin
    .from("leads")
    .update({
      qualificado: true,
      etapa: clean(body.etapa) || "qualificado",
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", lead.id)
    .eq("cliente_id", cliente.id)
    .select("id,nome,telefone,cliente_id,etapa,qualificado")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    action: lead.qualificado ? "already_qualified" : "qualified",
    lead: atualizado,
  });
}
