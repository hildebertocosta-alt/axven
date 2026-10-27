export const REVENUE_LABELS: Record<string, string> = {
  "20": "Até R$ 20 mil",
  "34": "R$ 20 mil a R$ 35 mil",
  "60": "R$ 35 mil a R$ 60 mil",
  "100": "R$ 60 mil a R$ 100 mil",
  "300": "R$ 100 mil a R$ 300 mil",
  "301": "Acima de R$ 300 mil",
};

export const NEW_PATIENTS_LABELS: Record<string, string> = {
  "0-5": "Até 5",
  "6-10": "De 6 a 10",
  "11-20": "De 11 a 20",
  "21-40": "De 21 a 40",
  "41-60": "De 41 a 60",
  "61+": "Mais de 60",
};

export function isQualifiedClinic(revenueKey: string) {
  const minimumRevenueInThousands = Number(revenueKey);
  return Number.isFinite(minimumRevenueInThousands) && minimumRevenueInThousands >= 35;
}

// /clinicas V3 (19/10/2026): formulário de 4 campos e sem corte de faturamento.
// Os campos que deixaram de ser perguntados ficam gravados com este valor.
export const CLINICAS_V3_NOT_COLLECTED = "nao_coletado_v3";

// /clinicas/aula (27/10/2026): inscrição na aula ao vivo para clínicas de estética.
// Grava na mesma tabela (aquisicao_axven_leads) com landing própria; o nome da clínica vai em `clinica`
// e as perguntas que essa página não faz ficam com este valor. Entra como etapa "lead", sem qualificar.
export const AULA_CLINICAS_LANDING_ID = "clinicas-aula";
export const AULA_CLINICAS_LANDING_PAGE = "/clinicas/aula";
export const AULA_CLINICAS_NOT_COLLECTED = "nao_coletado_aula";

// Celular BR: DDD (11 a 99) + 9 + 8 dígitos, sem o 55.
export function isValidBrazilMobile(digits: string) {
  return /^[1-9][1-9]9\d{8}$/.test(digits);
}
