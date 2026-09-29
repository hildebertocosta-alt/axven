import assert from "node:assert/strict";
import test from "node:test";
import { dataLembrete, limiteParado, linkParados, textoLembrete } from "../app/lib/lembreteParados.ts";

test("texto do lembrete com plural e singular", () => {
  const link = linkParados("camilo-imoveis");
  assert.equal(link, "https://www.axvendigital.com.br/crm/camilo-imoveis?parados=1");
  assert.equal(
    textoLembrete({ nomeAtendente: "Joelson Silva", nomeCliente: "Camilo Imóveis", parados: 14, link }),
    `Bom dia, Joelson! ☀️\n\nVocê tem *14 leads sem atualização* há mais de 3 dias na Camilo Imóveis.\n\nAtualize em 2 minutos: ${link}`,
  );
  assert.match(textoLembrete({ nomeAtendente: null, nomeCliente: "X", parados: 1, link }), /^Bom dia! ☀️[\s\S]*\*1 lead sem atualização\*/);
});

test("data do lembrete é o dia de Brasília", () => {
  assert.equal(dataLembrete(new Date("2026-09-30T02:30:00Z")), "2026-09-29");
  assert.equal(dataLembrete(new Date("2026-09-30T11:30:00Z")), "2026-09-30");
});

test("limite de parado é 3 dias antes", () => {
  assert.equal(limiteParado(new Date("2026-09-30T11:30:00.000Z")), "2026-09-27T11:30:00.000Z");
});
