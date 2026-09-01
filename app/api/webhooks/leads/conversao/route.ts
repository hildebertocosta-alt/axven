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

function money(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw.replace(/[^0-9.-]/g, "");
  const parsed = Number(normalized.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
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
  const valor = money(body.valor_conversao ?? body.valor ?? body.value);
  const moeda = (clean(body.moeda) || clean(body.currency) || "BRL").toUpperCase();
  const dataConversao = clean(body.data_conversao) || clean(body.data_compra) || new Date().toISOString();

  if (!clienteId && !clienteSlug) {
    return NextResponse.json({ error: "informe cliente_id ou cliente_slug" }, { status: 400 });
  }
  if (valor === null || valor < 0) {
    return NextResponse.json({ error: "informe um valor de conversao valido" }, { status: 400 });
  }
  if (!leadId && !telefone && !whatsappLid && !ctwaclid) {
    return NextResponse.json({ error: "informe lead_id, telefone, whatsapp_lid ou ctwaclid" }, { status: 400 });
  }

  let clienteQuery = supabaseAdmin.from("clientes").select("id,nome,status");
  if (clienteId) clienteQuery = clienteQuery.eq("id", clienteId);
  else clienteQuery = clienteQuery.eq("slug", clienteSlug!);

  const { data: cliente, error: clienteError } = await clienteQuery.maybeSingle();
  if (clienteError || !cliente) return NextResponse.json({ error: "cliente nao encontrado" }, { status: 404 });
  if (cliente.status === "cancelado") return NextResponse.json({ error: "cliente fora da carteira ativa" }, { status: 403 });

  const select = "id,nome,telefone,cliente_id,etapa,valor_conversao,moeda,data_conversao,ctwaclid,page_id";
  let lead: any = null;

  if (leadId) {
    const { data } = await supabaseAdmin.from("leads").select(select).eq("cliente_id", cliente.id).eq("id", leadId).maybeSingle();
    lead = data;
  }
  if (!lead && telefone) {
    const { data } = await supabaseAdmin.from("leads").select(select).eq("cliente_id", cliente.id).eq("telefone", telefone).order("criado_em", { ascending: false }).limit(1).maybeSingle();
    lead = data;
  }
  if (!lead && whatsappLid) {
    const { data } = await supabaseAdmin.from("leads").select(select).eq("cliente_id", cliente.id).eq("whatsapp_lid", whatsappLid).order("criado_em", { ascending: false }).limit(1).maybeSingle();
    lead = data;
  }
  if (!lead && ctwaclid) {
    const { data } = await supabaseAdmin.from("leads").select(select).eq("cliente_id", cliente.id).eq("ctwaclid", ctwaclid).order("criado_em", { ascending: false }).limit(1).maybeSingle();
    lead = data;
  }

  if (!lead) return NextResponse.json({ error: "lead nao encontrado" }, { status: 404 });

  const jaConvertido = lead.data_conversao != null;
  const { data: atualizado, error } = await supabaseAdmin
    .from("leads")
    .update({
      etapa: clean(body.etapa) || "venda",
      valor_conversao: valor,
      moeda,
      data_conversao: dataConversao,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", lead.id)
    .eq("cliente_id", cliente.id)
    .select("id,nome,telefone,cliente_id,etapa,valor_conversao,moeda,data_conversao,ctwaclid,page_id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    action: jaConvertido ? "conversion_updated" : "converted",
    lead: atualizado,
    capi: {
      ready: Boolean(atualizado.ctwaclid && atualizado.page_id),
      event_name: "Purchase",
      value: atualizado.valor_conversao,
      currency: atualizado.moeda,
    },
  });
}
