import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

const TZ = "America/Sao_Paulo";
const SLOT_HOURS = [9, 10, 14, 15, 16, 17];
const SLOT_MINUTES = 45;

function localParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).formatToParts(date);
  return Object.fromEntries(parts.map((p) => [p.type, p.value]));
}

function slotIso(year: string, month: string, day: string, hour: number) {
  return `${year}-${month}-${day}T${String(hour).padStart(2, "0")}:00:00-03:00`;
}

function validSlot(date: Date) {
  const local = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(date);
  const get = (type: string) => local.find((p) => p.type === type)?.value || "";
  const weekday = get("weekday");
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  return !["Sat", "Sun"].includes(weekday) && SLOT_HOURS.includes(hour) && minute === 0;
}

export async function GET() {
  const now = new Date();
  const horizon = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);
  const { data: booked, error } = await supabaseAdmin.from("aquisicao_axven_agendamentos").select("inicio").eq("status", "agendado").gte("inicio", now.toISOString()).lte("inicio", horizon.toISOString());
  if (error) return NextResponse.json({ error: "falha_disponibilidade" }, { status: 500 });
  const occupied = new Set((booked || []).map((x) => new Date(x.inicio).toISOString()));
  const slots: string[] = [];
  for (let i = 0; i < 21 && slots.length < 30; i++) {
    const cursor = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    const p = localParts(cursor);
    if (["Sat", "Sun"].includes(p.weekday)) continue;
    for (const hour of SLOT_HOURS) {
      const slot = new Date(slotIso(p.year, p.month, p.day, hour));
      if (slot.getTime() <= now.getTime() + 60 * 60 * 1000) continue;
      if (!occupied.has(slot.toISOString())) slots.push(slot.toISOString());
    }
  }
  return NextResponse.json({ timezone: TZ, durationMinutes: SLOT_MINUTES, slots }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const leadId = typeof body?.leadId === "string" ? body.leadId : "";
  const inicio = typeof body?.inicio === "string" ? new Date(body.inicio) : new Date(NaN);
  if (!leadId || Number.isNaN(inicio.getTime()) || inicio <= new Date() || !validSlot(inicio)) return NextResponse.json({ error: "agendamento_invalido" }, { status: 400 });

  const { data: lead } = await supabaseAdmin.from("aquisicao_axven_leads").select("id, qualificado").eq("id", leadId).single();
  if (!lead?.qualificado) return NextResponse.json({ error: "lead_nao_qualificado" }, { status: 403 });

  const fim = new Date(inicio.getTime() + SLOT_MINUTES * 60 * 1000);
  const { data, error } = await supabaseAdmin.from("aquisicao_axven_agendamentos").insert({ lead_id: leadId, inicio: inicio.toISOString(), fim: fim.toISOString(), timezone: TZ, status: "agendado" }).select("id, inicio, fim").single();
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "horario_indisponivel" }, { status: 409 });
    return NextResponse.json({ error: "falha_agendamento" }, { status: 500 });
  }
  await supabaseAdmin.from("aquisicao_axven_leads").update({ etapa: "agendado", agendado_em: inicio.toISOString(), atualizado_em: new Date().toISOString() }).eq("id", leadId);
  return NextResponse.json({ ok: true, booking: data }, { headers: { "Cache-Control": "no-store" } });
}
