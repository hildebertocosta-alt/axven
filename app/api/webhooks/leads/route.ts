import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { validateWebhookSecret } from "@/app/lib/webhookAuth";

function clean(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function nested(obj: any, path: string[]) {
  let value = obj;
  for (const key of path) value = value?.[key];
  return value;
}

function normalizePhone(value: unknown) {
  const raw = clean(value);
  if (!raw) return null;
  return raw.split("@")[0]?.replace(/\D/g, "") || null;
}

function booleanValue(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return ["true", "1", "sim", "yes"].includes(value.toLowerCase());
  return false;
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\./g, "").replace(",", ".").replace(/[^0-9.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function POST(req: NextRequest) {
  const authError = validateWebhookSecret(req);
  if (authError) return authError;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "corpo invalido" }, { status: 400 });
  }

  const message = body.message ?? body.body?.message ?? {};
  const chat = body.chat ?? body.body?.chat ?? {};
  const externalAdReply =
    nested(message, ["content", "contextInfo", "externalAdReply"]) ??
    nested(body, ["body", "message", "content", "contextInfo", "externalAdReply"]) ??
    {};

  const clienteId = clean(body.cliente_id);
  const clienteSlug = clean(body.cliente_slug);
  const metaAccountId = clean(body.meta_account_id) || clean(body.account_id);

  let clienteQuery = supabaseAdmin.from("clientes").select("id,nome,status,slug,meta_account_id");
  if (clienteId) clienteQuery = clienteQuery.eq("id", clienteId);
  else if (clienteSlug) clienteQuery = clienteQuery.eq("slug", clienteSlug);
  else if (metaAccountId) clienteQuery = clienteQuery.eq("meta_account_id", metaAccountId.replace(/^act_/, ""));
  else return NextResponse.json({ error: "informe cliente_id, cliente_slug ou meta_account_id" }, { status: 400 });

  const { data: cliente, error: clienteError } = await clienteQuery.maybeSingle();
  if (clienteError || !cliente) {
    return NextResponse.json({ error: "cliente nao encontrado" }, { status: 404 });
  }
  if (cliente.status === "cancelado") {
    return NextResponse.json({ error: "cliente fora da carteira ativa" }, { status: 403 });
  }

  const telefone =
    normalizePhone(body.telefone) ||
    normalizePhone(body.phone) ||
    normalizePhone(body.whatsapp) ||
    normalizePhone(message.chatid) ||
    normalizePhone(message.sender_pn) ||
    normalizePhone(chat.wa_chatid);

  const whatsappLid = clean(body.whatsapp_lid) || clean(body.lid) || clean(chat.wa_chatlid)?.replace(/@lid$/, "") || null;
  const ctwaclid = clean(body.ctwaclid) || clean(externalAdReply.ctwaClid);
  const anuncioSourceId =
    clean(body.anuncio_source_id) || clean(body.source_id) || clean(body.ad_id) || clean(externalAdReply.sourceID);

  const nome =
    clean(body.nome) ||
    clean(body.name) ||
    clean(message.senderName) ||
    clean(chat.wa_contactName) ||
    clean(chat.name) ||
    "Lead sem nome";

  const origem = clean(body.origem) || clean(body.source) || (ctwaclid ? "WhatsApp Ads" : "Nao informada");
  const tipoCaptacao =
    clean(body.tipo_captacao) ||
    (origem.toLowerCase().includes("whatsapp") ? "whatsapp" : origem.toLowerCase().includes("org") ? "organico" : "formulario");

  const payload = {
    cliente_id: cliente.id,
    nome,
    telefone,
    etapa: clean(body.etapa) || "lead",
    origem,
    tipo_captacao: tipoCaptacao,
    campanha: clean(body.campanha) || clean(body.campaign_name),
    conjunto: clean(body.conjunto) || clean(body.adset_name),
    anuncio: clean(body.anuncio) || clean(body.ad_name),
    plataforma: clean(body.plataforma) || clean(body.platform) || clean(externalAdReply.sourceApp),
    ctwaclid,
    anuncio_source_id: anuncioSourceId,
    whatsapp_lid: whatsappLid,
    page_id: clean(body.page_id),
    email: clean(body.email),
    qualificado: booleanValue(body.qualificado ?? body.qualified_lead),
    valor_conversao: numberValue(body.valor_conversao ?? body.valor ?? body.value),
    moeda: clean(body.moeda) || clean(body.currency),
    data_conversao: clean(body.data_conversao) || clean(body.data_compra),
    atualizado_em: new Date().toISOString(),
  };

  let existingId: string | null = null;
  if (telefone) {
    const { data } = await supabaseAdmin
      .from("leads")
      .select("id")
      .eq("cliente_id", cliente.id)
      .eq("telefone", telefone)
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    existingId = data?.id ?? null;
  }

  if (!existingId && whatsappLid) {
    const { data } = await supabaseAdmin
      .from("leads")
      .select("id")
      .eq("cliente_id", cliente.id)
      .eq("whatsapp_lid", whatsappLid)
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    existingId = data?.id ?? null;
  }

  if (!existingId && ctwaclid) {
    const { data } = await supabaseAdmin
      .from("leads")
      .select("id")
      .eq("cliente_id", cliente.id)
      .eq("ctwaclid", ctwaclid)
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    existingId = data?.id ?? null;
  }

  if (existingId) {
    const { data: lead, error } = await supabaseAdmin
      .from("leads")
      .update(payload)
      .eq("id", existingId)
      .select("id,nome,cliente_id,etapa,tipo_captacao")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, action: "updated", lead });
  }

  const { data: lead, error } = await supabaseAdmin
    .from("leads")
    .insert({ ...payload, criado_em: new Date().toISOString(), pausado_ia: false, follow_up_enviado: false })
    .select("id,nome,cliente_id,etapa,tipo_captacao")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, action: "created", lead }, { status: 201 });
}
