import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

function clean(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function bool(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function safeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  return aBuf.length === bBuf.length && timingSafeEqual(aBuf, bBuf);
}

function isAuthorized(provided: string | null) {
  if (!provided) return false;

  const ingestSecret = process.env.AXVEN_N8N_INGEST_SECRET;
  if (ingestSecret && safeEqual(provided, ingestSecret)) return true;

  const authSecret = process.env.AUTH_SECRET;
  if (authSecret && safeEqual(provided, authSecret)) return true;

  return false;
}

function stripWhatsappSuffix(value: unknown) {
  const text = clean(value);
  if (!text) return null;
  return text.replace(/@(s\.whatsapp\.net|lid)$/i, "").replace(/\D/g, "") || null;
}

function getNested(obj: any, path: string[]) {
  return path.reduce((acc, key) => (acc && typeof acc === "object" ? acc[key] : undefined), obj);
}

function normalizarMensagem(body: any) {
  const message = body?.message ?? body?.body?.message ?? {};
  const chat = body?.chat ?? body?.body?.chat ?? {};
  const externalAdReply = getNested(message, ["content", "contextInfo", "externalAdReply"]) ?? {};

  const telefone =
    stripWhatsappSuffix(message?.chatid) ||
    stripWhatsappSuffix(message?.sender_pn) ||
    stripWhatsappSuffix(chat?.wa_chatid) ||
    stripWhatsappSuffix(body?.telefone) ||
    stripWhatsappSuffix(body?.phone) ||
    stripWhatsappSuffix(body?.whatsapp);

  const lid =
    stripWhatsappSuffix(chat?.wa_chatlid) ||
    stripWhatsappSuffix(message?.chatlid) ||
    stripWhatsappSuffix(message?.sender_lid) ||
    clean(body?.whatsapp_lid) ||
    clean(body?.LID);

  let mensagem = clean(body?.mensagem) || clean(body?.message_text);
  if (!mensagem) {
    if (typeof message?.content === "string") mensagem = clean(message.content);
    else if (message?.content && typeof message.content === "object") mensagem = clean(message.content.text);
    mensagem = mensagem || clean(message?.text);
  }

  const nome =
    clean(body?.nome) ||
    clean(body?.name) ||
    clean(message?.senderName) ||
    clean(chat?.wa_contactName) ||
    clean(chat?.wa_name) ||
    clean(chat?.name) ||
    "Lead sem nome";

  const ctwaclid = clean(body?.ctwaclid) || clean(externalAdReply?.ctwaClid);
  const sourceId =
    clean(body?.anuncio_source_id) ||
    clean(body?.source_id) ||
    clean(body?.ad_id) ||
    clean(externalAdReply?.sourceID);
  const sourceApp = clean(body?.plataforma) || clean(body?.platform) || clean(externalAdReply?.sourceApp);

  const origemInformada = clean(body?.origem) || clean(body?.source);
  const tipoCaptacaoInformado = clean(body?.tipo_captacao);
  const tipoCaptacao = tipoCaptacaoInformado || (ctwaclid ? "whatsapp" : origemInformada?.toLowerCase().includes("lead ads") ? "formulario" : "organico");
  const origem = origemInformada || (ctwaclid ? "WhatsApp Ads" : tipoCaptacao === "formulario" ? "Meta Lead Ads" : "WhatsApp Orgânico");

  return {
    telefone,
    whatsapp_lid: lid,
    nome,
    mensagem,
    from_me: bool(body?.fromMe ?? message?.fromMe, false),
    ctwaclid,
    anuncio_source_id: sourceId,
    plataforma: sourceApp,
    tipo_captacao: tipoCaptacao,
    origem,
    campanha: clean(body?.campanha) || clean(body?.campaign_name),
    conjunto: clean(body?.conjunto) || clean(body?.adset_name),
    anuncio: clean(body?.anuncio) || clean(body?.ad_name),
    page_id: clean(body?.page_id),
    email: clean(body?.email),
    qualificado: bool(body?.qualificado ?? body?.qualified_lead, false),
    valor_conversao: typeof body?.valor_conversao === "number" ? body.valor_conversao : clean(body?.valor_conversao),
    moeda: clean(body?.moeda) || clean(body?.currency),
    data_conversao: clean(body?.data_conversao) || clean(body?.data_compra),
    etapa: clean(body?.etapa) || clean(body?.etapa_lead) || "lead",
  };
}

export async function POST(req: NextRequest) {
  const provided = req.headers.get("x-axven-secret");
  if (!isAuthorized(provided)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Payload inválido" }, { status: 400 });

  const clienteId = clean((body as any).cliente_id);
  const clienteSlug = clean((body as any).cliente_slug);
  const metaAccountId = clean((body as any).meta_account_id) || clean((body as any).account_id);
  const normalizado = normalizarMensagem(body);

  let clienteQuery = supabaseAdmin.from("clientes").select("id,nome,status,meta_account_id,slug");
  if (clienteId) clienteQuery = clienteQuery.eq("id", clienteId);
  else if (clienteSlug) clienteQuery = clienteQuery.eq("slug", clienteSlug);
  else if (metaAccountId) clienteQuery = clienteQuery.eq("meta_account_id", metaAccountId.replace(/^act_/, ""));
  else return NextResponse.json({ error: "Informe cliente_id, cliente_slug ou meta_account_id" }, { status: 400 });

  const { data: cliente, error: clienteError } = await clienteQuery.maybeSingle();
  if (clienteError || !cliente) return NextResponse.json({ error: "Cliente não encontrado para este lead" }, { status: 404 });
  if (cliente.status === "cancelado") return NextResponse.json({ error: "Cliente fora da carteira ativa" }, { status: 403 });

  const payload = {
    nome: normalizado.nome,
    telefone: normalizado.telefone,
    etapa: normalizado.etapa,
    cliente_id: cliente.id,
    origem: normalizado.origem,
    campanha: normalizado.campanha,
    conjunto: normalizado.conjunto,
    anuncio: normalizado.anuncio,
    plataforma: normalizado.plataforma,
    ctwaclid: normalizado.ctwaclid,
    anuncio_source_id: normalizado.anuncio_source_id,
    tipo_captacao: normalizado.tipo_captacao,
    whatsapp_lid: normalizado.whatsapp_lid,
    page_id: normalizado.page_id,
    email: normalizado.email,
    qualificado: normalizado.qualificado,
    valor_conversao: normalizado.valor_conversao,
    moeda: normalizado.moeda,
    data_conversao: normalizado.data_conversao,
    atualizado_em: new Date().toISOString(),
  };

  const selectLead = () =>
    supabaseAdmin
      .from("leads")
      .select("id")
      .eq("cliente_id", cliente.id)
      .order("criado_em", { ascending: false })
      .limit(1);

  let existente: { id: string } | null = null;

  if (normalizado.telefone) {
    const { data } = await selectLead().eq("telefone", normalizado.telefone).maybeSingle();
    existente = data;
  }

  if (!existente && normalizado.whatsapp_lid) {
    const { data } = await selectLead().eq("whatsapp_lid", normalizado.whatsapp_lid).maybeSingle();
    existente = data;
  }

  if (!existente && normalizado.ctwaclid) {
    const { data } = await selectLead().eq("ctwaclid", normalizado.ctwaclid).maybeSingle();
    existente = data;
  }

  if (existente?.id) {
    const { data, error } = await supabaseAdmin.from("leads").update(payload).eq("id", existente.id).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, action: "updated", cliente: { id: cliente.id, nome: cliente.nome }, lead: data, normalizado });
  }

  const { data, error } = await supabaseAdmin
    .from("leads")
    .insert({ ...payload, criado_em: new Date().toISOString(), pausado_ia: false, follow_up_enviado: false })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, action: "created", cliente: { id: cliente.id, nome: cliente.nome }, lead: data, normalizado }, { status: 201 });
}
