import assert from "node:assert/strict";
import test from "node:test";
import { isQualifiedClinic, NEW_PATIENTS_LABELS, REVENUE_LABELS } from "../app/lib/clinicAcquisition.ts";

test("mantém as faixas de faturamento homologadas", () => { assert.equal(REVENUE_LABELS["60"], "R$ 35 mil a R$ 60 mil"); assert.equal(Object.keys(REVENUE_LABELS).length, 6); });
test("qualificação mantém o corte atual de R$ 35 mil", () => { assert.equal(isQualifiedClinic("20"), false); assert.equal(isQualifiedClinic("34"), false); assert.equal(isQualifiedClinic("60"), true); assert.equal(isQualifiedClinic("301"), true); });
test("novos pacientes aceita somente as opções da V2", () => { assert.deepEqual(Object.keys(NEW_PATIENTS_LABELS), ["0-5", "6-10", "11-20", "21-40", "41-60", "61+"]); });
