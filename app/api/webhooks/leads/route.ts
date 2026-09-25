import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { validateWebhookSecret } from "@/app/lib/webhookAuth";

// Recebe leads normalizados pelo n8n e registra no CRM do cliente correspondente.
// Quando a campanha nao vem no payload do Facebook Lead Ads, usa o ad_id
// (anuncio_source_id) para completar a atribuicao pela camada Meta persistida.
// O registro passa pela RPC registrar_lead_v1, que garante:
//   - formulario Meta idempotente por leadgen_id (reentregas nao duplicam);
//   - WhatsApp com 1 lead aberto por pessoa (cada mensagem nao vira um lead novo);
//   - data original do lead (criado_em_meta) e respostas do formulario preservadas.
export async function POST(req: NextRequest) {
  const authError = validateWebhookSecret(req);
  if (authError) return authError;

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "corpo invalido" }, { status: 400 });
  }

  const {
    cliente_slug,
    nome,
    telefone,
    email,
    campanha,
    conjunto,
    anuncio,
    plataforma,
    origem,
    ctwaclid,
    anuncio_source_id,
    tipo_captacao,
    page_id,
    pixel_id,
    dataset_id,
    whatsapp_lid,
    leadgen_id,
    form_id,
    criado_em_meta,
    respostas_formulario,
  } = body as {
    cliente_slug?: string;
    nome?: string;
    telefone?: string;
    email?: string;
    campanha?: string;
    conjunto?: string;
    anuncio?: string;
    plataforma?: string;
    origem?: string;
    ctwaclid?: string;
    anuncio_source_id?: string;
    tipo_captacao?: string;
    page_id?: string;
    pixel_id?: string;
    dataset_id?: string;
    whatsapp_lid?: string;
    leadgen_id?: string;
    form_id?: string;
    criado_em_meta?: string;
    respostas_formulario?: Record<string, unknown>;
  };

  if (!cliente_slug || !nome) {
    return NextResponse.json({ error: "cliente_slug e nome sao obrigatorios" }, { status: 400 });
  }

  const { data: cliente, error: clienteError } = await supabaseAdmin
    .from("clientes")
    .select("id")
    .eq("slug", cliente_slug)
    .single();

  if (clienteError || !cliente) {
    return NextResponse.json({ error: "cliente nao encontrado" }, { status: 404 });
  }

  let campanhaFinal = campanha ?? null;
  let conjuntoFinal = conjunto ?? null;
  let anuncioFinal = anuncio ?? null;

  if (anuncio_source_id && (!campanhaFinal || !conjuntoFinal || !anuncioFinal)) {
    const { data: insight } = await supabaseAdmin
      .from("meta_ads_insights_daily")
      .select("campaign_name, adset_name, ad_name")
      .eq("cliente_id", cliente.id)
      .eq("ad_id", anuncio_source_id)
      .order("metric_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (insight) {
      campanhaFinal = campanhaFinal ?? insight.campaign_name ?? null;
      conjuntoFinal = conjuntoFinal ?? insight.adset_name ?? null;
      anuncioFinal = anuncioFinal ?? insight.ad_name ?? null;
    }
  }

  // Data original do lead: so aceita um timestamp valido (senao a RPC usa now()).
  const criadoEmOrigem =
    criado_em_meta && !Number.isNaN(Date.parse(criado_em_meta.replace(/([+-]\d{2})(\d{2})$/, "$1:$2")))
      ? criado_em_meta
      : null;

  const { data, error } = await supabaseAdmin.rpc("registrar_lead_v1", {
    p: {
      cliente_id: cliente.id,
      nome,
      telefone: telefone ?? null,
      email: email ?? null,
      origem: origem ?? null,
      campanha: campanhaFinal,
      conjunto: conjuntoFinal,
      anuncio: anuncioFinal,
      plataforma: plataforma ?? null,
      ctwaclid: ctwaclid ?? null,
      anuncio_source_id: anuncio_source_id ?? null,
      tipo_captacao: tipo_captacao ?? null,
      page_id: page_id ?? null,
      pixel_id: pixel_id ?? null,
      dataset_id: dataset_id ?? null,
      whatsapp_lid: whatsapp_lid ?? null,
      leadgen_id: leadgen_id ?? null,
      form_id: form_id ?? null,
      criado_em_origem: criadoEmOrigem,
      respostas_formulario:
        respostas_formulario && typeof respostas_formulario === "object" ? respostas_formulario : null,
    },
  });

  const registro = Array.isArray(data) ? data[0] : data;
  if (error || !registro?.lead_id) {
    return NextResponse.json({ error: error?.message ?? "falha ao registrar lead" }, { status: 500 });
  }

  const { data: lead, error: leadError } = await supabaseAdmin
    .from("leads")
    .select("id, nome, cliente_id, etapa")
    .eq("id", registro.lead_id)
    .single();

  if (leadError || !lead) {
    return NextResponse.json({ error: leadError?.message ?? "lead nao encontrado" }, { status: 500 });
  }

  // `criado` = false quando o lead ja existia (reentrega do Meta ou nova mensagem no WhatsApp).
  return NextResponse.json({ lead, criado: registro.criado });
}
