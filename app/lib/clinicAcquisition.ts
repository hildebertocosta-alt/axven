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
