import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { validateWebhookSecret } from "@/app/lib/webhookAuth";

// Recebe leads normalizados pelo n8n e insere no CRM do cliente correspondente.
// Quando a campanha nao vem no payload do Facebook Lead Ads, usa o ad_id
// (anuncio_source_id) para completar a atribuicao pela camada Meta persistida.
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

  const { data: lead, error: leadError } = await supabaseAdmin
    .from("leads")
    .insert({
      cliente_id: cliente.id,
      nome,
      telefone: telefone ?? null,
      email: email ?? null,
      etapa: "lead",
      origem: origem ?? "Meta Ads",
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
    })
    .select("id, nome, cliente_id, etapa")
    .single();

  if (leadError) {
    return NextResponse.json({ error: leadError.message }, { status: 500 });
  }

  return NextResponse.json({ lead });
}
