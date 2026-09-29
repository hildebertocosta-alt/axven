// Cálculos da aba Resultado do portal (Painel Axven · Entrega 2).
// Sem imports com alias, para ser testado direto com `node --test`.
// Coorte: conta os leads que CHEGARAM no período, com a etapa atual de cada um.

export type TipoEtapaResultado = "novo" | "qualificacao" | "oportunidade" | "venda" | "perdido";
export type EtapaResultado = { chave: string; nome: string; tipo: TipoEtapaResultado };
export type LeadResultado = {
  etapa: string;
  etapaAntesDaPerda: string | null;
  valor: number | null;
  anuncioId: string | null;
  anuncioNome: string | null;
};
export type GastoAnuncio = { adId: string; adNome: string | null; gasto: number };
export type Periodo = { chave: "mes" | "7d" | "30d" | "personalizado"; inicio: string; fim: string; rotulo: string };

const MINIMO_LEADS_GARGALO = 5;
const DATA = /^\d{4}-\d{2}-\d{2}$/;
const DIA_MS = 24 * 60 * 60 * 1000;

function paraData(texto: string): Date | null {
  if (!DATA.test(texto)) return null;
  const data = new Date(`${texto}T00:00:00Z`);
  return Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== texto ? null : data;
}

function somarDias(texto: string, dias: number): string {
  return new Date((paraData(texto) as Date).getTime() + dias * DIA_MS).toISOString().slice(0, 10);
}

function formatarData(texto: string): string {
  const [ano, mes, dia] = texto.split("-");
  return `${dia}/${mes}/${ano}`;
}

const dinheiro = (valor: number) => Math.round(valor * 100) / 100;

export function resolverPeriodo(params: { periodo?: string; inicio?: string; fim?: string }, hoje: string): Periodo {
  if (params.periodo === "7d") return { chave: "7d", inicio: somarDias(hoje, -6), fim: hoje, rotulo: "Últimos 7 dias" };
  if (params.periodo === "30d") return { chave: "30d", inicio: somarDias(hoje, -29), fim: hoje, rotulo: "Últimos 30 dias" };
  if (params.periodo === "personalizado" && params.inicio && params.fim) {
    const inicio = paraData(params.inicio);
    const fim = paraData(params.fim);
    if (inicio && fim && inicio <= fim && (fim.getTime() - inicio.getTime()) / DIA_MS <= 366) {
      return {
        chave: "personalizado",
        inicio: params.inicio,
        fim: params.fim,
        rotulo: `${formatarData(params.inicio)} a ${formatarData(params.fim)}`,
      };
    }
  }
  return { chave: "mes", inicio: `${hoje.slice(0, 8)}01`, fim: hoje, rotulo: "Este mês" };
}

function tipoDe(etapas: EtapaResultado[], chave: string): TipoEtapaResultado | null {
  return etapas.find((etapa) => etapa.chave === chave)?.tipo ?? null;
}

function ehVenda(etapas: EtapaResultado[], lead: LeadResultado): boolean {
  return tipoDe(etapas, lead.etapa) === "venda" && Number(lead.valor ?? 0) > 0;
}

export function resumoResultado(etapas: EtapaResultado[], leads: LeadResultado[], gastos: GastoAnuncio[]) {
  const investimento = dinheiro(gastos.reduce((total, gasto) => total + Number(gasto.gasto || 0), 0));
  const vendidos = leads.filter((lead) => ehVenda(etapas, lead));
  const receita = dinheiro(vendidos.reduce((total, lead) => total + Number(lead.valor), 0));
  const vendas = vendidos.length;
  return {
    investimento,
    leads: leads.length,
    vendas,
    receita,
    custoPorVenda: vendas > 0 && investimento > 0 ? dinheiro(investimento / vendas) : null,
    roas: investimento > 0 ? Math.round((receita / investimento) * 100) / 100 : null,
    ticketMedio: vendas > 0 ? dinheiro(receita / vendas) : null,
  };
}

export function funil(etapas: EtapaResultado[], leads: LeadResultado[]) {
  const caminho = etapas.filter((etapa) => etapa.tipo !== "perdido");
  const posicao = new Map(caminho.map((etapa, indice) => [etapa.chave, indice]));

  const alcancou = leads.map((lead) => {
    if (tipoDe(etapas, lead.etapa) === "perdido") {
      return lead.etapaAntesDaPerda !== null && posicao.has(lead.etapaAntesDaPerda) ? (posicao.get(lead.etapaAntesDaPerda) as number) : 0;
    }
    return posicao.get(lead.etapa) ?? 0;
  });

  const resultado = caminho.map((etapa, indice) => ({
    chave: etapa.chave,
    nome: etapa.nome,
    alcancaram: alcancou.filter((posicaoLead) => posicaoLead >= indice).length,
    passagem: null as number | null,
  }));
  for (let i = 1; i < resultado.length; i += 1) {
    const anterior = resultado[i - 1].alcancaram;
    resultado[i].passagem = anterior > 0 ? resultado[i].alcancaram / anterior : null;
  }

  let gargalo: { chave: string; nome: string; perdaPct: number } | null = null;
  let menorPassagem = 1;
  for (let i = 1; i < resultado.length; i += 1) {
    const passagem = resultado[i].passagem;
    if (passagem === null || resultado[i - 1].alcancaram < MINIMO_LEADS_GARGALO) continue;
    if (passagem < menorPassagem) {
      menorPassagem = passagem;
      gargalo = { chave: resultado[i - 1].chave, nome: resultado[i - 1].nome, perdaPct: Math.round((1 - passagem) * 100) };
    }
  }

  return { etapas: resultado, gargalo };
}

export function rankingAnuncios(etapas: EtapaResultado[], leads: LeadResultado[], gastos: GastoAnuncio[]) {
  type Linha = { chave: string; nome: string; leads: number; vendas: number; receita: number; investimento: number };
  const linhas = new Map<string, Linha>();
  const linha = (chave: string, nome: string) => {
    if (!linhas.has(chave)) linhas.set(chave, { chave, nome, leads: 0, vendas: 0, receita: 0, investimento: 0 });
    return linhas.get(chave) as Linha;
  };

  for (const gasto of gastos) {
    const atual = linha(gasto.adId, gasto.adNome ?? gasto.adId);
    atual.investimento = dinheiro(atual.investimento + Number(gasto.gasto || 0));
    if (gasto.adNome) atual.nome = gasto.adNome;
  }

  for (const lead of leads) {
    const chave = lead.anuncioId ?? (lead.anuncioNome ? `nome:${lead.anuncioNome}` : "sem-anuncio");
    const nome = lead.anuncioNome ?? (chave === "sem-anuncio" ? "Sem anúncio identificado" : chave);
    const atual = linha(chave, nome);
    atual.leads += 1;
    if (ehVenda(etapas, lead)) {
      atual.vendas += 1;
      atual.receita = dinheiro(atual.receita + Number(lead.valor));
    }
  }

  return [...linhas.values()]
    .map((item) => ({ ...item, custoPorVenda: item.vendas > 0 && item.investimento > 0 ? dinheiro(item.investimento / item.vendas) : null }))
    .sort((a, b) => b.receita - a.receita || b.vendas - a.vendas || b.leads - a.leads || b.investimento - a.investimento);
}
