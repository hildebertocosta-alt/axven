export type ClientStatus = "verificar" | "alerta" | "atenção" | "crítico";

export type Client = {
  id: number;
  name: string;
  slug: string;
  niche: string;
  status: ClientStatus;
  opportunityScore: number | string;
  ctrTrend: string;
  budgetStatus: string;
  lastReview: string;
  summary: string;
  objective: string;
  metrics: {
    score: number | string;
    ctrTrend: string;
    budgetStatus: string;
  };
  alerts: string[];
  recommendations: string[];
  actions: Array<{ title: string; detail: string; when: string }>;
};

export const clients: Client[] = [
  {
    id: 1,
    name: "Face e Corpo",
    slug: "face-e-corpo",
    niche: "Clínica estética premium",
    status: "verificar",
    opportunityScore: "Pendente",
    ctrTrend: "Score pendente",
    budgetStatus: "Em análise",
    lastReview: "06/06",
    summary: "Cliente com performance em revisão e necessidade de validação de score.",
    objective: "Aumentar leads qualificados para tratamento de estética",
    metrics: { score: "Pendente", ctrTrend: "Sem atualização consolidada", budgetStatus: "Em análise" },
    alerts: ["Score ainda não foi consolidado", "Última revisão registrada em 06/06"],
    recommendations: [
      "Confirmar o score com base em conversões recentes.",
      "Avaliar se há oportunidade de novo teste de criativo.",
    ],
    actions: [
      { title: "Revisão de performance iniciada", detail: "Dados foram consolidados para análise", when: "Hoje" },
      { title: "Criativo em revisão", detail: "Aguardando validação do time", when: "Ontem" },
    ],
  },
  {
    id: 2,
    name: "Dra. Gabriela Brito",
    slug: "dra-gabriela-brito",
    niche: "Consultório especializado",
    status: "alerta",
    opportunityScore: 71,
    ctrTrend: "CTR caiu 29,9%",
    budgetStatus: "Budget limitado",
    lastReview: "04/06",
    summary: "Campanha com queda de CTR e orçamento restrito.",
    objective: "Gerar mais agendamentos para procedimentos premium",
    metrics: { score: 71, ctrTrend: "CTR caiu 29,9%", budgetStatus: "Budget limitado" },
    alerts: ["CTR caiu 29,9% em relação à semana anterior", "Budget limitado e precisa de revisão"],
    recommendations: [
      "Revisar a abordagem de vídeo e CTA.",
      "Reduzir a segmentação ampla para aumentar qualidade de lead.",
    ],
    actions: [
      { title: "Análise de audience", detail: "Segmentação expandida para perfis de interesse", when: "Há 5h" },
      { title: "Relatório semanal enviado", detail: "Resumo com foco em CPL", when: "Ontem" },
    ],
  },
  {
    id: 3,
    name: "Edson Da Hora",
    slug: "edson-da-hora",
    niche: "Personal brand e negócios",
    status: "atenção",
    opportunityScore: 86,
    ctrTrend: "CTR caiu 8,3%",
    budgetStatus: "Budget limitado",
    lastReview: "05/06",
    summary: "Campanha com queda moderada e necessidade de atenção operacional.",
    objective: "Aumentar volume de contatos de oportunidade comercial",
    metrics: { score: 86, ctrTrend: "CTR caiu 8,3%", budgetStatus: "Budget limitado" },
    alerts: ["CTR caiu 8,3% e exige ajuste de criativo", "Budget limitado e precisa de otimização"],
    recommendations: [
      "Manter a cadência de criativos com linguagem mais direta.",
      "Explorar CTA de conversa para WhatsApp como próxima etapa.",
    ],
    actions: [
      { title: "Variações de criativo preparadas", detail: "Três versões com tom mais direto", when: "Há 3h" },
      { title: "Métricas analisadas", detail: "CPL e CTR monitorados com foco em conversão", when: "Hoje" },
    ],
  },
  {
    id: 4,
    name: "Marquinhos Estilos",
    slug: "marquinhos-estilos",
    niche: "Moda e e-commerce",
    status: "crítico",
    opportunityScore: 95,
    ctrTrend: "4 criativos com CTR caindo 25% a 92%",
    budgetStatus: "Revisão urgente",
    lastReview: "03/06",
    summary: "Cliente com queda severa de CTR em 4 criativos e necessidade de ação imediata.",
    objective: "Aumentar retorno de anúncio com geração de vendas",
    metrics: { score: 95, ctrTrend: "4 criativos com CTR caindo 25% a 92%", budgetStatus: "Revisão urgente" },
    alerts: ["CTR caiu de forma consistente em quatro criativos", "Campanha em estado crítico e precisa de reestruturação"],
    recommendations: [
      "Recalibrar o budget para evitar desperdício de impressão.",
      "Criar uma campanha de remarketing com oferta mais clara.",
    ],
    actions: [
      { title: "Kickoff inicial concluído", detail: "Estratégia e objetivos definidos", when: "Há 1 dia" },
      { title: "Planejamento de criativos", detail: "Variações sugeridas para testes", when: "Há 5h" },
    ],
  },
];

export const todayTasks = [
  { title: "Revisar criativos da Face e Corpo", href: "/clientes/face-e-corpo" },
  { title: "Responder 12 leads do Edson Da Hora", href: "/clientes/edson-da-hora" },
  { title: "Enviar relatório da Dra. Gabriela", href: "/relatorios" },
  { title: "Aprovar campanha de Marquinhos", href: "/clientes/marquinhos-estilos" },
];

export const alertsFeed = [
  { title: "CTR subiu 12% na Face e Corpo", time: "Há 12 min" },
  { title: "Budget de Marquinhos precisa ser ajustado", time: "Há 35 min" },
  { title: "Relatório semanal pendente para Dra. Gabriela", time: "Há 1h" },
];

export const activityFeed = [
  "Campanha aprovada para o cliente Edson Da Hora",
  "Nova variação de anúncio criada para Face e Corpo",
  "Lead qualificado encaminhado ao time comercial",
];

export const reports = [
  { client: "Face e Corpo", status: "Enviado", when: "Hoje" },
  { client: "Dra. Gabriela Brito", status: "Pendente", when: "Hoje" },
  { client: "Edson Da Hora", status: "Em revisão", when: "Ontem" },
];
