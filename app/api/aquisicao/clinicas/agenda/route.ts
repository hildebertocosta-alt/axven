import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import {
  ACQUISITION_BOOKING_HORIZON_DAYS,
  ACQUISITION_SLOT_DURATION_MINUTES,
  ACQUISITION_TIMEZONE,
  buildAcquisitionSlots,
  isAllowedAcquisitionSlot,
} from "@/app/lib/acquisitionBooking";

export async function GET() {
  const now = new Date();
  const horizon = new Date(now.getTime() + ACQUISITION_BOOKING_HORIZON_DAYS * 24 * 60 * 60 * 1000);
  const { data: booked, error } = await supabaseAdmin.from("aquisicao_axven_agendamentos").select("inicio").eq("status", "agendado").gte("inicio", now.toISOString()).lte("inicio", horizon.toISOString());
  if (error) return NextResponse.json({ error: "falha_disponibilidade" }, { status: 500 });
  const occupied = new Set((booked || []).map((x) => new Date(x.inicio).toISOString()));
  const slots = buildAcquisitionSlots(now, occupied);
  return NextResponse.json({ timezone: ACQUISITION_TIMEZONE, durationMinutes: ACQUISITION_SLOT_DURATION_MINUTES, slots }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const leadId = typeof body?.leadId === "string" ? body.leadId : "";
  const inicio = typeof body?.inicio === "string" ? new Date(body.inicio) : new Date(NaN);
  const now = new Date();
  if (!leadId || !isAllowedAcquisitionSlot(inicio, now)) return NextResponse.json({ error: "agendamento_invalido" }, { status: 400 });

  const fim = new Date(inicio.getTime() + ACQUISITION_SLOT_DURATION_MINUTES * 60 * 1000);
  const { data, error } = await supabaseAdmin.rpc("reserve_aquisicao_axven_appointment", {
    p_lead_id: leadId,
    p_inicio: inicio.toISOString(),
    p_fim: fim.toISOString(),
    p_timezone: ACQUISITION_TIMEZONE,
  });
  if (error) {
    if (error.message.includes("lead_nao_qualificado")) return NextResponse.json({ error: "lead_nao_qualificado" }, { status: 403 });
    if (error.message.includes("horario_indisponivel") || error.message.includes("lead_ja_agendado")) return NextResponse.json({ error: "horario_indisponivel" }, { status: 409 });
    if (error.message.includes("agendamento_invalido")) return NextResponse.json({ error: "agendamento_invalido" }, { status: 400 });
    return NextResponse.json({ error: "falha_agendamento" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, booking: data, whatsappConfirmationQueued: true }, { headers: { "Cache-Control": "no-store" } });
}
