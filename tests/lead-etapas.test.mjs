import assert from "node:assert/strict";
import test from "node:test";
import {
  ETAPA_PERDIDO,
  ETAPA_VENDA,
  MOTIVOS_PERDA,
  interpretarMudancaEtapa,
  lerValorMonetario,
  normalizarEtapaLegada,
  ordenarEtapas,
  paramsRpcEtapa,
  traduzirErroEtapa,
} from "../app/lib/leadEtapas.ts";

const AGORA = new Date("2026-09-29T15:00:00.000Z");

test("etapas antigas viram as novas, com motivo quando é perda", () => {
  assert.deepEqual(normalizarEtapaLegada("agendado"), { etapa: "oportunidade", motivo: null });
  assert.deepEqual(normalizarEtapaLegada("proposta_enviada"), { etapa: "oportunidade", motivo: null });
  assert.deepEqual(normalizarEtapaLegada("nao_fechou"), { etapa: "perdido", motivo: "outro" });
  assert.deepEqual(normalizarEtapaLegada("desqualificado"), { etapa: "perdido", motivo: "fora_do_perfil" });
  assert.deepEqual(normalizarEtapaLegada("visita_feita"), { etapa: "visita_feita", motivo: null });
});

test("lista de motivos de perda é exatamente a aprovada", () => {
  assert.deepEqual(MOTIVOS_PERDA.map((m) => m.chave), [
    "preco", "parou_de_responder", "sem_interesse", "comprou_em_outro_lugar", "fora_do_perfil", "outro",
  ]);
});

test("ordenação: Novo primeiro, etapas do meio pela ordem, Venda e Perdido no fim", () => {
  const etapas = [
    { chave: "perdido", nome: "Perdido", tipo: "perdido", ordem: 100 },
    { chave: "oportunidade", nome: "Visita", tipo: "oportunidade", ordem: 30 },
    { chave: "fechado", nome: "Venda", tipo: "venda", ordem: 90 },
    { chave: "lead", nome: "Novo", tipo: "novo", ordem: 10 },
    { chave: "qualificado", nome: "Qualificado", tipo: "qualificacao", ordem: 20 },
  ];
  assert.deepEqual(ordenarEtapas(etapas).map((e) => e.chave), ["lead", "qualificado", "oportunidade", "fechado", "perdido"]);
});

test("valor em formato brasileiro, com R$ e com ponto decimal", () => {
  assert.equal(lerValorMonetario("2.500,50"), 2500.5);
  assert.equal(lerValorMonetario("R$ 1.200,00"), 1200);
  assert.equal(lerValorMonetario("1500.75"), 1500.75);
  assert.equal(lerValorMonetario(980), 980);
  assert.equal(lerValorMonetario("0"), null);
  assert.equal(lerValorMonetario("-10"), null);
  assert.equal(lerValorMonetario("abc"), null);
  assert.equal(lerValorMonetario(undefined), null);
});

test("venda exige valor e preenche moeda e data padrão", () => {
  assert.deepEqual(interpretarMudancaEtapa({ etapa: "fechado" }, AGORA), { ok: false, erro: "Informe o valor da venda." });
  const r = interpretarMudancaEtapa({ etapa: "fechado", valor: "1.850,456" }, AGORA);
  assert.equal(r.ok, true);
  assert.deepEqual(r.pedido, {
    etapa: ETAPA_VENDA, valor: 1850.46, moeda: "BRL", dataConversao: "2026-09-29T15:00:00.000Z", motivo: null, motivoDetalhe: null,
  });
});

test("venda com moeda ou data inválida é recusada", () => {
  assert.equal(interpretarMudancaEtapa({ etapa: "fechado", valor: 10, moeda: "ARS" }, AGORA).erro, "Moeda inválida.");
  assert.equal(interpretarMudancaEtapa({ etapa: "fechado", valor: 10, data_conversao: "ontem" }, AGORA).erro, "Data da venda inválida.");
});

test("perda exige motivo da lista; etapa antiga desqualificado já traz o motivo", () => {
  assert.equal(interpretarMudancaEtapa({ etapa: "perdido" }, AGORA).erro, "Escolha o motivo da perda.");
  assert.equal(interpretarMudancaEtapa({ etapa: "perdido", motivo: "caro" }, AGORA).erro, "Escolha o motivo da perda.");
  const r = interpretarMudancaEtapa({ etapa: "perdido", motivo: "preco", motivo_detalhe: "  achou caro  " }, AGORA);
  assert.deepEqual(r.pedido, { etapa: ETAPA_PERDIDO, valor: null, moeda: null, dataConversao: null, motivo: "preco", motivoDetalhe: "achou caro" });
  const legado = interpretarMudancaEtapa({ etapa: "desqualificado" }, AGORA);
  assert.equal(legado.pedido.etapa, "perdido");
  assert.equal(legado.pedido.motivo, "fora_do_perfil");
});

test("etapa vazia ou fora do formato é recusada; etapa personalizada passa", () => {
  assert.equal(interpretarMudancaEtapa({}, AGORA).erro, "Informe a etapa.");
  assert.equal(interpretarMudancaEtapa({ etapa: "Visita Feita!" }, AGORA).erro, "Etapa inválida.");
  assert.equal(interpretarMudancaEtapa({ etapa: "visita_feita" }, AGORA).pedido.etapa, "visita_feita");
  assert.equal(interpretarMudancaEtapa(null, AGORA).erro, "Informe a etapa.");
});

test("erros do banco viram mensagem clara com status certo", () => {
  assert.deepEqual(traduzirErroEtapa("valor_venda_obrigatorio"), { status: 400, mensagem: "Informe o valor da venda." });
  assert.deepEqual(traduzirErroEtapa("motivo_perda_obrigatorio"), { status: 400, mensagem: "Escolha o motivo da perda." });
  assert.deepEqual(traduzirErroEtapa("etapa_invalida"), { status: 400, mensagem: "Essa etapa não existe no funil deste cliente." });
  assert.deepEqual(traduzirErroEtapa("lead_nao_encontrado"), { status: 404, mensagem: "Lead não encontrado." });
  assert.deepEqual(traduzirErroEtapa("connection reset"), { status: 500, mensagem: "Não foi possível atualizar o lead." });
});

test("parâmetros da RPC saem com os nomes que o banco espera", () => {
  const r = interpretarMudancaEtapa({ etapa: "perdido", motivo: "preco" }, AGORA);
  assert.deepEqual(paramsRpcEtapa("L1", "C1", r.pedido, "portal", "U1"), {
    p_lead_id: "L1", p_cliente_id: "C1", p_etapa: "perdido", p_valor: null, p_moeda: null, p_data_conversao: null,
    p_motivo: "preco", p_motivo_detalhe: null, p_origem: "portal", p_autor_user_id: "U1",
  });
});

test("milhar brasileiro sem centavos não vira centavos", () => {
  assert.equal(lerValorMonetario("1.200"), 1200);
  assert.equal(lerValorMonetario("R$ 2.500"), 2500);
  assert.equal(lerValorMonetario("1.250.000"), 1250000);
  assert.equal(lerValorMonetario("12.5"), 12.5);
});
