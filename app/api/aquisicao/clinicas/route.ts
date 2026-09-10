import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { isQualifiedClinic, NEW_PATIENTS_LABELS, REVENUE_LABELS } from "@/app/lib/clinicAcquisition";

function text(value: unknown, max = 300) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function nullable(value: unknown, max = 500) { const parsed = text(value, max); return parsed || null; }
function normalizeInstagram(value: unknown) { const raw = text(value, 160).replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@+/, "").replace(/\/$/, ""); return /^[A-Za-z0-9._]{1,30}$/.test(raw) ? `@${raw}` : ""; }
function resolveLandingPage(origin: unknown) { const raw = text(origin, 700); try { return new URL(raw).pathname === "/analise" ? "/analise" : "/clinicas"; } catch { return "/clinicas"; } }

const LEAD_RESPONSE_FIELDS = "id, qualificado, etapa";

export async function GET() {
  const { error } = await supabaseAdmin.from("aquisicao_axven_leads").select("id", { head: true, count: "exact" }).limit(1);
  return NextResponse.json({ ok: !error, version: "clinicas-v2", database: error ? "unavailable" : "reachable" }, { status: error ? 503 : 200, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "payload_invalido" }, { status: 400 });

  const nome = text(body.name, 120), whatsappDigits = text(body.whatsapp, 40).replace(/\D/g, ""), instagram = normalizeInstagram(body.instagram), revenueKey = text(body.revenue, 10), ads = text(body.ads, 100), challenge = text(body.challenge, 160), newPatientsKey = text(body.new_patients, 10), submissionId = text(body.submission_id, 36), faturamentoMinMil = Number(revenueKey);
  if (!nome || whatsappDigits.length !== 11 || !instagram || !REVENUE_LABELS[revenueKey] || !ads || !challenge || !NEW_PATIENTS_LABELS[newPatientsKey] || !Number.isFinite(faturamentoMinMil) || (submissionId && !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submissionId))) {
    return NextResponse.json({ error: "campos_obrigatorios_ou_invalidos" }, { status: 400 });
  }

  if (submissionId) {
    const { data: existing, error: lookupError } = await supabaseAdmin.from("aquisicao_axven_leads").select(LEAD_RESPONSE_FIELDS).eq("submission_id", submissionId).maybeSingle();
    if (lookupError) { console.error("[aquisicao-clinicas] idempotency lookup error"); return NextResponse.json({ error: "falha_ao_salvar" }, { status: 500 }); }
    if (existing) return NextResponse.json({ id: existing.id, qualified: existing.qualificado, stage: existing.etapa, version: "clinicas-v2", idempotent: true }, { headers: { "Cache-Control": "no-store" } });
  }

  const qualificado = isQualifiedClinic(revenueKey), forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "", landingPage = resolveLandingPage(body.origin_url);
  const { data, error } = await supabaseAdmin.from("aquisicao_axven_leads").insert({
    vertical: "clinicas_estetica", landing_page: landingPage, nome, clinica: instagram, whatsapp: `55${whatsappDigits}`, instagram,
    faturamento_faixa: REVENUE_LABELS[revenueKey], faturamento_min_mil: faturamentoMinMil, investimento_ads_faixa: ads, desafio_principal: challenge, novos_pacientes_faixa: NEW_PATIENTS_LABELS[newPatientsKey],
    atendimento_leads: "nao_coletado_v2", capacidade_investimento_faixa: "nao_coletado_v2", capacidade_min_mil: 0, inicio_pretendido: "nao_coletado_v2",
    qualificado, motivo_desqualificacao: qualificado ? null : "faturamento_abaixo_35k", etapa: qualificado ? "qualificado" : "desqualificado", submission_id: submissionId || null,
    utm_source: nullable(body.utm_source, 180), utm_medium: nullable(body.utm_medium, 180), utm_campaign: nullable(body.utm_campaign, 250), utm_content: nullable(body.utm_content, 250), utm_term: nullable(body.utm_term, 250), fbclid: nullable(body.fbclid, 500), campaign_id: nullable(body.campaign_id, 120), adset_id: nullable(body.adset_id, 120), ad_id: nullable(body.ad_id, 120), origem_url: nullable(body.origin_url, 700), user_agent: nullable(req.headers.get("user-agent"), 700), ip_hash: forwardedFor ? createHash("sha256").update(forwardedFor).digest("hex") : null,
  }).select(LEAD_RESPONSE_FIELDS).single();

  if (error) {
    if (error.code === "23505" && submissionId) {
      const { data: existing } = await supabaseAdmin.from("aquisicao_axven_leads").select(LEAD_RESPONSE_FIELDS).eq("submission_id", submissionId).single();
      if (existing) return NextResponse.json({ id: existing.id, qualified: existing.qualificado, stage: existing.etapa, version: "clinicas-v2", idempotent: true }, { headers: { "Cache-Control": "no-store" } });
    }
    console.error("[aquisicao-clinicas] insert error", { code: error.code });
    return NextResponse.json({ error: "falha_ao_salvar" }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, qualified: data.qualificado, stage: data.etapa, landingPage, version: "clinicas-v2", idempotent: false }, { headers: { "Cache-Control": "no-store" } });
}
