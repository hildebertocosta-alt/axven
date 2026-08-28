import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

function clean(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
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

export async function POST(req: NextRequest) {
  const provided = req.headers.get("x-axven-secret");
  if (!isAuthorized(provided)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Payload inválido" }, { status: 400 });

  const clienteId = clean(body.cliente_id);
  const metaAccountId = clean(body.meta_account_id) || clean(body.account_id);
  const telefone = clean(body.telefone) || clean(body.phone) || clean(body.whatsapp);
  const nome = clean(body.nome) || clean(body.name) || "Lead sem nome";

  let clienteQuery = supabaseAdmin.from("clientes").select("id,nome,status_pagamento,meta_account_id");
  if (clienteId) clienteQuery = clienteQuery.eq("id", clienteId);
  else if (metaAccountId) clienteQuery = clienteQuery.eq("meta_account_id", metaAccountId.replace(/^act_/, ""));
  else return NextResponse.json({ error: "Informe cliente_id ou meta_account_id" }, { status: 400 });

  const { data: cliente, error: clienteError } = await clienteQuery.maybeSingle();
  if (clienteError || !cliente) return NextResponse.json({ error: "Cliente não encontrado para este lead" }, { status: 404 });
  if (cliente.status_pagamento === "cancelado") return NextResponse.json({ error: "Cliente fora da carteira ativa" }, { status: 403 });

  const payload = {
    nome,
    telefone,
    etapa: clean(body.etapa) || "lead",
    cliente_id: cliente.id,
    origem: clean(body.origem) || clean(body.source) || "Não informada",
    campanha: clean(body.campanha) || clean(body.campaign_name),
    conjunto: clean(body.conjunto) || clean(body.adset_name),
    anuncio: clean(body.anuncio) || clean(body.ad_name),
    plataforma: clean(body.plataforma) || clean(body.platform),
    ctwaclid: clean(body.ctwaclid),
    anuncio_source_id: clean(body.anuncio_source_id) || clean(body.ad_id),
    atualizado_em: new Date().toISOString(),
  };

  if (telefone) {
    const { data: existente } = await supabaseAdmin
      .from("leads")
      .select("id")
      .eq("cliente_id", cliente.id)
      .eq("telefone", telefone)
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existente?.id) {
      const { data, error } = await supabaseAdmin.from("leads").update(payload).eq("id", existente.id).select("*").single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, action: "updated", cliente: { id: cliente.id, nome: cliente.nome }, lead: data });
    }
  }

  const { data, error } = await supabaseAdmin
    .from("leads")
    .insert({ ...payload, criado_em: new Date().toISOString(), pausado_ia: false, follow_up_enviado: false })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, action: "created", cliente: { id: cliente.id, nome: cliente.nome }, lead: data }, { status: 201 });
}
