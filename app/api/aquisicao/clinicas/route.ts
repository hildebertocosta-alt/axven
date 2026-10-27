import { createHash, randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { AULA_CLINICAS_LANDING_ID, AULA_CLINICAS_LANDING_PAGE, AULA_CLINICAS_NOT_COLLECTED, CLINICAS_V3_NOT_COLLECTED, isQualifiedClinic, isValidBrazilMobile, NEW_PATIENTS_LABELS, REVENUE_LABELS } from "@/app/lib/clinicAcquisition";
import { buildMetaLeadEventId } from "@/app/lib/metaLeadEvent";

function text(value: unknown, max = 300) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function nullable(value: unknown, max = 500) { const parsed = text(value, max); return parsed || null; }
function normalizeInstagram(value: unknown) { const raw = text(value, 160).replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@+/, "").replace(/\/$/, ""); return /^[A-Za-z0-9._]{1,30}$/.test(raw) ? `@${raw}` : ""; }
function resolveLandingPage(origin: unknown) { const raw = text(origin, 700); try { return new URL(raw).pathname === "/analise" ? "/analise" : "/clinicas"; } catch { return "/clinicas"; } }

const LEAD_RESPONSE_FIELDS = "id, qualificado, etapa, meta_event_id";

export async function GET() {
  const { error } = await supabaseAdmin.from("aquisicao_axven_leads").select("id", { head: true, count: "exact" }).limit(1);
  return NextResponse.json({ ok: !error, version: "clinicas-v2", database: error ? "unavailable" : "reachable" }, { status: error ? 503 : 200, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "payload_invalido" }, { status: 400 });

  // /clinicas/aula manda a landing explícita e tem fluxo próprio (3 campos, sem qualificação nem agenda).
  if (text(body.landing, 40) === AULA_CLINICAS_LANDING_ID) return createAulaLead(req, body);

  // /clinicas V3 pergunta só nome, WhatsApp, Instagram e faturamento; /analise segue com as 7 perguntas.
  const landingPage = resolveLandingPage(body.origin_url);
  const isClinicasV3 = landingPage === "/clinicas";
  const nome = text(body.name, 120), whatsappDigits = text(body.whatsapp, 40).replace(/\D/g, ""), instagram = normalizeInstagram(body.instagram), revenueKey = text(body.revenue, 10), ads = text(body.ads, 100) || (isClinicasV3 ? CLINICAS_V3_NOT_COLLECTED : ""), challenge = text(body.challenge, 160) || (isClinicasV3 ? CLINICAS_V3_NOT_COLLECTED : ""), newPatientsKey = text(body.new_patients, 10), submissionId = text(body.submission_id, 36), faturamentoMinMil = Number(revenueKey);
  const newPatientsOk = Boolean(NEW_PATIENTS_LABELS[newPatientsKey]) || (isClinicasV3 && !newPatientsKey);
  if (!nome || whatsappDigits.length !== 11 || !instagram || !REVENUE_LABELS[revenueKey] || !ads || !challenge || !newPatientsOk || !Number.isFinite(faturamentoMinMil) || (submissionId && !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submissionId))) {
    return NextResponse.json({ error: "campos_obrigatorios_ou_invalidos" }, { status: 400 });
  }

  if (submissionId) {
    const { data: existing, error: lookupError } = await supabaseAdmin.from("aquisicao_axven_leads").select(LEAD_RESPONSE_FIELDS).eq("submission_id", submissionId).maybeSingle();
    if (lookupError) { console.error("[aquisicao-clinicas] idempotency lookup error"); return NextResponse.json({ error: "falha_ao_salvar" }, { status: 500 }); }
    if (existing) return NextResponse.json({ id: existing.id, qualified: existing.qualificado, stage: existing.etapa, meta_event_id: existing.meta_event_id, version: "clinicas-v2", idempotent: true }, { headers: { "Cache-Control": "no-store" } });
  }

  const qualificado = isClinicasV3 || isQualifiedClinic(revenueKey), forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const metaEventId = buildMetaLeadEventId(randomUUID());
  const { data, error } = await supabaseAdmin.from("aquisicao_axven_leads").insert({
    vertical: "clinicas_estetica", landing_page: landingPage, nome, clinica: instagram, whatsapp: `55${whatsappDigits}`, instagram,
    faturamento_faixa: REVENUE_LABELS[revenueKey], faturamento_min_mil: faturamentoMinMil, investimento_ads_faixa: ads, desafio_principal: challenge, novos_pacientes_faixa: NEW_PATIENTS_LABELS[newPatientsKey] ?? CLINICAS_V3_NOT_COLLECTED,
    atendimento_leads: "nao_coletado_v2", capacidade_investimento_faixa: "nao_coletado_v2", capacidade_min_mil: 0, inicio_pretendido: "nao_coletado_v2",
    qualificado, motivo_desqualificacao: qualificado ? null : "faturamento_abaixo_35k", etapa: qualificado ? "qualificado" : "desqualificado", submission_id: submissionId || null, meta_event_id: metaEventId,
    utm_source: nullable(body.utm_source, 180), utm_medium: nullable(body.utm_medium, 180), utm_campaign: nullable(body.utm_campaign, 250), utm_content: nullable(body.utm_content, 250), utm_term: nullable(body.utm_term, 250), fbclid: nullable(body.fbclid, 500), campaign_id: nullable(body.campaign_id, 120), adset_id: nullable(body.adset_id, 120), ad_id: nullable(body.ad_id, 120), origem_url: nullable(body.origin_url, 700), user_agent: nullable(req.headers.get("user-agent"), 700), ip_hash: forwardedFor ? createHash("sha256").update(forwardedFor).digest("hex") : null,
  }).select(LEAD_RESPONSE_FIELDS).single();

  if (error) {
    if (error.code === "23505" && submissionId) {
      const { data: existing } = await supabaseAdmin.from("aquisicao_axven_leads").select(LEAD_RESPONSE_FIELDS).eq("submission_id", submissionId).single();
      if (existing) return NextResponse.json({ id: existing.id, qualified: existing.qualificado, stage: existing.etapa, meta_event_id: existing.meta_event_id, version: "clinicas-v2", idempotent: true }, { headers: { "Cache-Control": "no-store" } });
    }
    console.error("[aquisicao-clinicas] insert error", { code: error.code });
    return NextResponse.json({ error: "falha_ao_salvar" }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, qualified: data.qualificado, stage: data.etapa, meta_event_id: data.meta_event_id, landingPage, version: "clinicas-v2", idempotent: false }, { headers: { "Cache-Control": "no-store" } });
}

// Inscrição na aula ao vivo (/clinicas/aula). Mesma tabela, landing própria e etapa "lead" (sem qualificar):
// como o lead não é qualificado, a agenda (reserve_aquisicao_axven_appointment) recusa e nada entra no outbox de WhatsApp.
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function findAulaLead(submissionId: string) {
  const { data, error } = await supabaseAdmin.from("aquisicao_axven_leads").select(LEAD_RESPONSE_FIELDS).eq("submission_id", submissionId).maybeSingle();
  if (error) throw error;
  return data;
}

function aulaResponse(lead: { id: string; qualificado: boolean; etapa: string; meta_event_id: string | null }, idempotent: boolean) {
  return NextResponse.json({ id: lead.id, qualified: lead.qualificado, stage: lead.etapa, meta_event_id: lead.meta_event_id, landingPage: AULA_CLINICAS_LANDING_PAGE, version: "clinicas-aula-v1", idempotent }, { headers: { "Cache-Control": "no-store" } });
}

async function createAulaLead(req: NextRequest, body: Record<string, unknown>) {
  const nome = text(body.name, 120), clinica = text(body.clinic, 120), whatsappDigits = text(body.whatsapp, 40).replace(/\D/g, ""), submissionId = text(body.submission_id, 36);
  if (nome.length < 2 || clinica.length < 2 || !isValidBrazilMobile(whatsappDigits) || (submissionId && !UUID_V4.test(submissionId))) {
    return NextResponse.json({ error: "campos_obrigatorios_ou_invalidos" }, { status: 400 });
  }

  if (submissionId) {
    try { const existing = await findAulaLead(submissionId); if (existing) return aulaResponse(existing, true); }
    catch { console.error("[aquisicao-clinicas-aula] idempotency lookup error"); return NextResponse.json({ error: "falha_ao_salvar" }, { status: 500 }); }
  }

  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const { data, error } = await supabaseAdmin.from("aquisicao_axven_leads").insert({
    vertical: "clinicas_estetica", landing_page: AULA_CLINICAS_LANDING_PAGE, nome, clinica, whatsapp: `55${whatsappDigits}`, instagram: null,
    faturamento_faixa: AULA_CLINICAS_NOT_COLLECTED, faturamento_min_mil: 0, investimento_ads_faixa: AULA_CLINICAS_NOT_COLLECTED, desafio_principal: AULA_CLINICAS_NOT_COLLECTED, novos_pacientes_faixa: AULA_CLINICAS_NOT_COLLECTED,
    atendimento_leads: AULA_CLINICAS_NOT_COLLECTED, capacidade_investimento_faixa: AULA_CLINICAS_NOT_COLLECTED, capacidade_min_mil: 0, inicio_pretendido: AULA_CLINICAS_NOT_COLLECTED,
    qualificado: false, motivo_desqualificacao: null, etapa: "lead", submission_id: submissionId || null, meta_event_id: buildMetaLeadEventId(randomUUID()),
    utm_source: nullable(body.utm_source, 180), utm_medium: nullable(body.utm_medium, 180), utm_campaign: nullable(body.utm_campaign, 250), utm_content: nullable(body.utm_content, 250), utm_term: nullable(body.utm_term, 250), fbclid: nullable(body.fbclid, 500), campaign_id: nullable(body.campaign_id, 120), adset_id: nullable(body.adset_id, 120), ad_id: nullable(body.ad_id, 120), origem_url: nullable(body.origin_url, 700), user_agent: nullable(req.headers.get("user-agent"), 700), ip_hash: forwardedFor ? createHash("sha256").update(forwardedFor).digest("hex") : null,
  }).select(LEAD_RESPONSE_FIELDS).single();

  if (error) {
    if (error.code === "23505" && submissionId) {
      const existing = await findAulaLead(submissionId).catch(() => null);
      if (existing) return aulaResponse(existing, true);
    }
    console.error("[aquisicao-clinicas-aula] insert error", { code: error.code });
    return NextResponse.json({ error: "falha_ao_salvar" }, { status: 500 });
  }
  return aulaResponse(data, false);
}
