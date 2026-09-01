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

function findFirstKey(value: unknown, keys: string[]): string | null {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFirstKey(item, keys);
      if (found) return found;
    }
    return null;
  }
  const obj = value as Record<string, unknown>;
  for (const key of keys) {
    const candidate = obj[key];
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    if (typeof candidate === "number") return String(candidate);
  }
  for (const child of Object.values(obj)) {
    const found = findFirstKey(child, keys);
    if (found) return found;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const authError = validateWebhookSecret(req);
  if (authError) return authError;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "corpo invalido" }, { status: 400 });

  const clienteId = clean(body.cliente_id);
  const clienteSlug = clean(body.cliente_slug);
  const leadId = clean(body.lead_id);
  const telefone = normalizePhone(body.telefone ?? body.phone ?? body.whatsapp);

  if (!clienteId && !clienteSlug) return NextResponse.json({ error: "informe cliente_id ou cliente_slug" }, { status: 400 });
  if (!leadId && !telefone) return NextResponse.json({ error: "informe lead_id ou telefone" }, { status: 400 });

  let clienteQuery = supabaseAdmin.from("clientes").select("id,nome,status,pixel_id,meta_account_id");
  if (clienteId) clienteQuery = clienteQuery.eq("id", clienteId);
  else clienteQuery = clienteQuery.eq("slug", clienteSlug!);

  const { data: cliente } = await clienteQuery.maybeSingle();
  if (!cliente) return NextResponse.json({ error: "cliente nao encontrado" }, { status: 404 });
  if (cliente.status === "cancelado") return NextResponse.json({ error: "cliente fora da carteira ativa" }, { status: 403 });

  const fields = "id,nome,telefone,cliente_id,anuncio_source_id,ctwaclid,page_id,pixel_id,dataset_id,campanha,conjunto,anuncio,plataforma";
  let lead: any = null;
  if (leadId) {
    const { data } = await supabaseAdmin.from("leads").select(fields).eq("cliente_id", cliente.id).eq("id", leadId).maybeSingle();
    lead = data;
  }
  if (!lead && telefone) {
    const { data } = await supabaseAdmin.from("leads").select(fields).eq("cliente_id", cliente.id).eq("telefone", telefone).order("criado_em", { ascending: false }).limit(1).maybeSingle();
    lead = data;
  }
  if (!lead) return NextResponse.json({ error: "lead nao encontrado" }, { status: 404 });
  if (!lead.anuncio_source_id) return NextResponse.json({ error: "lead sem anuncio_source_id/sourceID" }, { status: 409 });

  const token = process.env.META_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ error: "META_ACCESS_TOKEN nao configurado" }, { status: 500 });

  const version = process.env.META_GRAPH_VERSION || "v23.0";
  const params = new URLSearchParams({
    fields: "id,name,campaign{name},adset{name},tracking_specs",
    access_token: token,
  });
  const url = `https://graph.facebook.com/${version}/${encodeURIComponent(lead.anuncio_source_id)}?${params.toString()}`;

  const response = await fetch(url, { cache: "no-store" });
  const meta = await response.json().catch(() => null);
  if (!response.ok || !meta) {
    return NextResponse.json({ error: "falha ao consultar Meta", status: response.status, details: meta?.error?.message || null }, { status: 502 });
  }

  const tracking = meta.tracking_specs ?? [];
  const pageId = findFirstKey(tracking, ["page", "page_id"]);
  const pixelId = findFirstKey(tracking, ["fb_pixel", "pixel", "pixel_id"]);
  const datasetId = findFirstKey(tracking, ["dataset", "dataset_id"]);

  const update = {
    campanha: clean(meta.campaign?.name) || lead.campanha,
    conjunto: clean(meta.adset?.name) || lead.conjunto,
    anuncio: clean(meta.name) || lead.anuncio,
    page_id: pageId || lead.page_id,
    pixel_id: pixelId || lead.pixel_id || cliente.pixel_id || null,
    dataset_id: datasetId || lead.dataset_id || null,
    atualizado_em: new Date().toISOString(),
  };

  const { data: atualizado, error } = await supabaseAdmin
    .from("leads")
    .update(update)
    .eq("id", lead.id)
    .eq("cliente_id", cliente.id)
    .select("id,nome,telefone,cliente_id,campanha,conjunto,anuncio,anuncio_source_id,ctwaclid,page_id,pixel_id,dataset_id,plataforma")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    mode: "enrichment_only",
    sent_to_meta_capi: false,
    lead: atualizado,
    readiness: {
      has_ctwaclid: Boolean(atualizado.ctwaclid),
      has_page_id: Boolean(atualizado.page_id),
      has_pixel_or_dataset: Boolean(atualizado.pixel_id || atualizado.dataset_id),
    },
  });
}
