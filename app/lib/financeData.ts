export type FinanceStatus = "Pago" | "Pendente" | "Atrasado" | "Vence hoje" | "Vence em breve";

export type FinanceClient = {
  id: string;
  client: string;
  value: number;
  dueDay: number;
};

export const financeClients: FinanceClient[] = [
  { id: "face-e-corpo", client: "Face e Corpo", value: 1000, dueDay: 1 },
  { id: "tritao-nautica", client: "Tritão Náutica", value: 800, dueDay: 5 },
  { id: "marquinhos", client: "Marquinhos", value: 600, dueDay: 3 },
  { id: "ejetec", client: "Ejetec", value: 2250, dueDay: 12 },
  { id: "rei-da-parmegiana", client: "Rei da Parmegiana", value: 500, dueDay: 14 },
  { id: "beatriz-lima-nutri", client: "Beatriz Lima Nutri", value: 500, dueDay: 12 },
  { id: "dra-gabriela", client: "Dra. Gabriela", value: 500, dueDay: 15 },
  { id: "edson-da-hora", client: "Edson Da Hora", value: 500, dueDay: 5 },
];

export function getFinanceStatus(dueDay: number, paid: boolean, today = new Date()): FinanceStatus {
  if (paid) return "Pago";

  const day = today.getDate();

  if (day > dueDay) return "Atrasado";
  if (day === dueDay) return "Vence hoje";
  if (dueDay - day <= 3) return "Vence em breve";

  return "Pendente";
}

export function getFinanceSummary(items: Array<{ value: number; paid: boolean; status: FinanceStatus }>) {
  const toReceive = items.filter((item) => !item.paid).reduce((sum, item) => sum + item.value, 0);
  const received = items.filter((item) => item.paid).reduce((sum, item) => sum + item.value, 0);
  const overdue = items.filter((item) => item.status === "Atrasado").reduce((sum, item) => sum + item.value, 0);

  return { toReceive, received, overdue };
}
