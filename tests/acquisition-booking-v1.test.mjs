import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildAcquisitionSlots,
  isAllowedAcquisitionSlot,
  minimumBookingTime,
  zonedDate,
} from "../app/lib/acquisitionBooking.ts";

test("regra compartilhada exige antecedência mínima de 8 horas", () => {
  const now = new Date("2026-09-14T12:00:00Z"); // 09:00 em São Paulo
  assert.equal(minimumBookingTime(now).toISOString(), "2026-09-14T20:00:00.000Z");
  assert.equal(isAllowedAcquisitionSlot(zonedDate("2026", "09", "14", 14), now), false);
  assert.equal(isAllowedAcquisitionSlot(zonedDate("2026", "09", "14", 17), now), true);
});

test("GET omite slots abaixo de 8h, preserva os válidos e remove ocupados", () => {
  const now = new Date("2026-09-14T12:00:00Z");
  const valid = zonedDate("2026", "09", "14", 17).toISOString();
  const slots = buildAcquisitionSlots(now, new Set());
  assert.ok(slots.includes(valid));
  assert.ok(slots.every((slot) => new Date(slot) >= minimumBookingTime(now)));
  assert.ok(!buildAcquisitionSlots(now, new Set([valid])).includes(valid));
});

test("POST recalcula a regra e usa somente a RPC transacional", async () => {
  const route = await readFile(new URL("../app/api/aquisicao/clinicas/agenda/route.ts", import.meta.url), "utf8");
  assert.match(route, /isAllowedAcquisitionSlot\(inicio, now\)/);
  assert.match(route, /rpc\("reserve_aquisicao_axven_appointment"/);
  assert.doesNotMatch(route, /from\("aquisicao_axven_agendamentos"\)\.insert/);
});

test("migration garante 8h, transação, conflito por intervalo e Outbox obrigatória", async () => {
  const sql = await readFile(new URL("../supabase/migrations/20260914100000_reserve_aquisicao_axven_appointment.sql", import.meta.url), "utf8");
  assert.match(sql, /now\(\) \+ interval '8 hours'/);
  assert.match(sql, /now\(\) \+ interval '21 days'/);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /tstzrange\(inicio, fim, '\[\)'\) && tstzrange\(p_inicio, p_fim, '\[\)'\)/);
  assert.match(sql, /insert into public\.aquisicao_axven_whatsapp_outbox/);
  assert.match(sql, /lead_id = p_lead_id and status = 'agendado'/);
  assert.match(sql, /revoke all .* from public, anon, authenticated/i);
  assert.doesNotMatch(sql, /\b(delete|drop|truncate)\b/i);
});

test("Agenda une aquisição e compromissos internos sem duplicação física", async () => {
  const page = await readFile(new URL("../app/dashboard/agenda/page.tsx", import.meta.url), "utf8");
  const view = await readFile(new URL("../app/dashboard/agenda/AgendaView.tsx", import.meta.url), "utf8");
  assert.match(page, /from\("compromissos"\)/);
  assert.match(page, /from\("aquisicao_axven_agendamentos"\)/);
  assert.match(page, /id: `aquisicao:\$\{item\.id\}`/);
  assert.match(view, /item\.origem === "interno"/);
  assert.match(view, /WhatsApp \{arg\.event\.extendedProps\.whatsappStatus/);
});

test("implementação não cria Google Calendar nem envia WhatsApp", async () => {
  const files = await Promise.all([
    readFile(new URL("../app/api/aquisicao/clinicas/agenda/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/dashboard/agenda/page.tsx", import.meta.url), "utf8"),
  ]);
  const source = files.join("\n");
  assert.doesNotMatch(source, /googleapis|calendar\.events|send\/text|axven\.uazapi/i);
});
