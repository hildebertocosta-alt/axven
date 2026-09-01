import crypto from "crypto";
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

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
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

  let clienteQuery = supabaseAdmin.from("clientes").select("id,nome,status,meta_account_id");
  if (clienteId) clienteQuery = clienteQuery.eq("id", clienteId);
  else clienteQuery = clienteQuery.eq("slug", clienteSlug!);

  const { data: cliente } = await clienteQuery.maybeSingle();
  if (!cliente) return NextResponse.json({ error: "cliente nao encontrado" }, { status: 404 });
  if (cliente.status === "cancelado") return NextResponse.json({ error: "cliente fora da carteira ativa" }, { status: 403 });

  const fields = "id,nome,telefone,cliente_id,etapa,valor_conversao,moeda,data_conversao,ctwaclid,page_id,anuncio_source_id,plataforma";
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
  if (!lead.data_conversao || lead.valor_conversao == null) return NextResponse.json({ error: "lead ainda nao possui conversao registrada" }, { status: 409 });

  const missing: string[] = [];
  if (!lead.telefone) missing.push("telefone");
  if (!lead.ctwaclid) missing.push("ctwaclid");
  if (!lead.page_id) missing.push("page_id");

  const eventTime = Math.floor(new Date(lead.data_conversao).getTime() / 1000);
  const eventId = `purchase_${lead.id}_${eventTime}`;

  const event = {
    event_name: "Purchase",
    event_time: eventTime,
    event_id: eventId,
    action_source: "business_messaging",
    messaging_channel: "whatsapp",
    user_data: {
      ph: lead.telefone ? [sha256(lead.telefone)] : [],
      ctwa_clid: lead.ctwaclid || null,
      page_id: lead.page_id || null,
    },
    custom_data: {
      currency: lead.moeda || "BRL",
      value: Number(lead.valor_conversao),
    },
  };

  const auditPayload = {
    mode: "preview_only",
    sent_to_meta: false,
    readiness: { ready: missing.length === 0, missing },
    event,
  };

  const { data: audit, error: auditError } = await supabaseAdmin
    .from("capi_eventos")
    .upsert(
      {
        cliente_id: cliente.id,
        lead_id: lead.id,
        event_name: event.event_name,
        event_id: eventId,
        status: "preview",
        payload: auditPayload,
        erro: null,
      },
      { onConflict: "event_id,status" },
    )
    .select("id,event_id,status,criado_em")
    .single();

  if (auditError) {
    console.error("Falha ao registrar preview CAPI", auditError);
    return NextResponse.json({ error: "falha ao registrar auditoria CAPI" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    mode: "preview_only",
    sent_to_meta: false,
    cliente: { id: cliente.id, nome: cliente.nome, meta_account_id: cliente.meta_account_id },
    lead: { id: lead.id, nome: lead.nome, anuncio_source_id: lead.anuncio_source_id, plataforma: lead.plataforma },
    readiness: { ready: missing.length === 0, missing },
    event,
    audit,
  });
}
