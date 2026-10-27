// Configuração da aula ao vivo para clínicas de estética (/clinicas/aula).

// LINK DA COMUNIDADE DO WHATSAPP: é o único lugar para trocar.
// Opção 1 (sem mexer no código): criar na Vercel a variável NEXT_PUBLIC_AULA_CLINICAS_COMUNIDADE_URL
// com o link (https://chat.whatsapp.com/...) e fazer um novo deploy.
// Opção 2: colar o link abaixo, em COMUNIDADE_URL_PADRAO, e fazer commit.
// Enquanto os dois estiverem vazios, a tela de confirmação diz que o link chega pelo WhatsApp.
const COMUNIDADE_URL_PADRAO = "";

function normalizarLink(valor: string | undefined) {
  const link = (valor ?? "").trim();
  return /^https:\/\/\S+$/i.test(link) ? link : "";
}

export const AULA_COMUNIDADE_URL = normalizarLink(process.env.NEXT_PUBLIC_AULA_CLINICAS_COMUNIDADE_URL || COMUNIDADE_URL_PADRAO);

// Data da aula: quarta, 18/11/2026, 19h30 às 20h45 (America/Recife, UTC-3).
export const AULA_SELO = "Aula ao vivo e gratuita · quarta, 18/11, às 19h30 · online";
export const AULA_DATA_TEXTO = "Quarta, 18/11, às 19h30 (horário de Brasília)";

const agenda = new URLSearchParams({
  action: "TEMPLATE",
  text: "Aula ao vivo Axven: anúncios que viram paciente pagante",
  dates: "20261118T193000/20261118T204500",
  ctz: "America/Recife",
  details: "Aula ao vivo e gratuita da Axven Digital para donas e donos de clínica de estética. O link de acesso chega no seu WhatsApp antes da aula.",
  location: "Online (link pelo WhatsApp)",
});

export const AULA_GOOGLE_AGENDA_URL = `https://calendar.google.com/calendar/render?${agenda.toString()}`;
