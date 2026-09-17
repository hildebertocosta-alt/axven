export type CobrancaStatus = "pago" | "pendente" | "atrasado" | "cancelado" | "em_dia";

export type SyncStatus = "ok" | "falhou" | "sem_registro";

export type HealthLevel = "critico" | "atencao" | "saudavel" | "sem_dados";

export type ClientHealthInput = {
  clienteId: string;
  nome: string;
  temContaMeta: boolean;
  cobranca: { status: CobrancaStatus; diaVencimento: number } | null;
  diaHoje: number;
  diasParaFimContrato: number | null;
  sincronizacao: SyncStatus;
  gastoUltimos7: number;
  gastoAnteriores7: number;
  leadsMetaUltimos7: number;
  leadsMetaAnteriores7: number;
  leadsCrmUltimos7: number;
};

export type ClientHealth = {
  clienteId: string;
  nome: string;
  nivel: HealthLevel;
  motivos: string[];
  acao: string;
};

// Queda de investimento vs. a própria média recente do cliente (não é benchmark de mercado).
export const QUEDA_INVESTIMENTO_CRITICA = 0.7;
// Alta no custo por lead vs. a própria média recente do cliente. É mais tolerante que a queda de
// investimento porque CPL varia mais naturalmente dia a dia; usado como ponto de partida para
// ajuste depois de observar o comportamento real dos clientes.
export const ALTA_CPL_ATENCAO = 0.4;
// Abaixo disso, gasto residual de conta não deve disparar alerta de "gastando sem leads".
export const GASTO_MINIMO_RELEVANTE = 50;
export const COBRANCA_PROXIMA_DIAS = 5;
export const CONTRATO_CRITICO_DIAS = 7;
export const CONTRATO_ATENCAO_DIAS = 30;

const HEALTH_ORDER: Record<HealthLevel, number> = { critico: 0, atencao: 1, sem_dados: 2, saudavel: 3 };

function cobrancaEstaAtrasada(cobranca: ClientHealthInput["cobranca"], diaHoje: number) {
  if (!cobranca) return false;
  if (cobranca.status === "atrasado") return true;
  if (cobranca.status === "pendente") return diaHoje > cobranca.diaVencimento;
  return false;
}

function cobrancaVenceEmBreve(cobranca: ClientHealthInput["cobranca"], diaHoje: number) {
  if (!cobranca || cobranca.status !== "pendente") return false;
  const diasRestantes = cobranca.diaVencimento - diaHoje;
  return diasRestantes >= 0 && diasRestantes <= COBRANCA_PROXIMA_DIAS;
}

function acaoParaMotivo(motivo: string): string {
  if (motivo.startsWith("Cobrança") && motivo.includes("atraso")) return "Cobrar o cliente e verificar o financeiro";
  if (motivo.startsWith("Cobrança")) return "Avisar o cliente que o vencimento está chegando";
  if (motivo.startsWith("Contrato")) return "Iniciar conversa de renovação do contrato";
  if (motivo.includes("sincroniz")) return "Verificar a conexão com o Meta Ads (token ou permissão)";
  if (motivo.startsWith("Investimento")) return "Checar se a campanha foi pausada ou ficou sem verba";
  if (motivo.startsWith("Custo por lead")) return "Revisar criativos e segmentação da campanha";
  if (motivo.startsWith("Investindo")) return "Revisar formulário e funil de captação — dinheiro saindo sem retorno";
  return "Revisar manualmente";
}

export function classifyClientHealth(input: ClientHealthInput): ClientHealth {
  const critico: string[] = [];
  const atencao: string[] = [];

  if (cobrancaEstaAtrasada(input.cobranca, input.diaHoje)) {
    critico.push("Cobrança do mês está em atraso");
  }
  if (input.diasParaFimContrato !== null && input.diasParaFimContrato <= CONTRATO_CRITICO_DIAS) {
    critico.push(`Contrato termina em ${Math.max(input.diasParaFimContrato, 0)} dia(s)`);
  }
  if (input.temContaMeta && input.sincronizacao === "falhou") {
    critico.push("Última sincronização com a Meta falhou — sem visibilidade da campanha");
  }
  if (input.temContaMeta && input.sincronizacao === "sem_registro") {
    critico.push("Sem sincronização recente registrada para essa conta");
  }
  if (input.temContaMeta && input.gastoAnteriores7 > 0) {
    const queda = (input.gastoAnteriores7 - input.gastoUltimos7) / input.gastoAnteriores7;
    if (queda >= QUEDA_INVESTIMENTO_CRITICA) {
      critico.push(`Investimento caiu ${Math.round(queda * 100)}% na última semana`);
    }
  }

  if (!critico.length) {
    if (cobrancaVenceEmBreve(input.cobranca, input.diaHoje)) {
      atencao.push("Cobrança do mês vence em poucos dias");
    }
    if (
      input.diasParaFimContrato !== null &&
      input.diasParaFimContrato > CONTRATO_CRITICO_DIAS &&
      input.diasParaFimContrato <= CONTRATO_ATENCAO_DIAS
    ) {
      atencao.push(`Contrato termina em ${input.diasParaFimContrato} dias`);
    }
    if (input.temContaMeta && input.leadsMetaAnteriores7 > 0 && input.leadsMetaUltimos7 > 0 && input.gastoAnteriores7 > 0) {
      const cplAnterior = input.gastoAnteriores7 / input.leadsMetaAnteriores7;
      const cplAtual = input.gastoUltimos7 / input.leadsMetaUltimos7;
      const alta = (cplAtual - cplAnterior) / cplAnterior;
      if (alta >= ALTA_CPL_ATENCAO) {
        atencao.push(`Custo por lead subiu ${Math.round(alta * 100)}% na última semana`);
      }
    }
    if (input.temContaMeta && input.gastoUltimos7 >= GASTO_MINIMO_RELEVANTE && input.leadsCrmUltimos7 === 0) {
      atencao.push("Investindo em anúncios sem nenhum lead novo no CRM na última semana");
    }
  }

  if (critico.length) {
    return { clienteId: input.clienteId, nome: input.nome, nivel: "critico", motivos: critico, acao: acaoParaMotivo(critico[0]) };
  }
  if (atencao.length) {
    return { clienteId: input.clienteId, nome: input.nome, nivel: "atencao", motivos: atencao, acao: acaoParaMotivo(atencao[0]) };
  }
  if (!input.temContaMeta) {
    return {
      clienteId: input.clienteId,
      nome: input.nome,
      nivel: "sem_dados",
      motivos: ["Sem conta de anúncios Meta conectada"],
      acao: "Conectar a conta de anúncios para acompanhar a saúde da campanha",
    };
  }
  return {
    clienteId: input.clienteId,
    nome: input.nome,
    nivel: "saudavel",
    motivos: ["Pagamento em dia, campanha estável e leads entrando"],
    acao: "Nenhuma ação necessária",
  };
}

export function sortByHealthSeverity(rows: ClientHealth[]): ClientHealth[] {
  return [...rows].sort((a, b) => HEALTH_ORDER[a.nivel] - HEALTH_ORDER[b.nivel] || a.nome.localeCompare(b.nome, "pt-BR"));
}
