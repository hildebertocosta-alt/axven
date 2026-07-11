import { NextResponse } from "next/server";

export async function GET() {
  const now = new Date().toISOString();

  return NextResponse.json({
    lastUpdated: now,
    clients: [
      {
        id: "gabriela",
        name: "Dra. Gabriela Brito",
        niche: "Clínica Estética · Leads",
        score: 71,
        status: "alerta",
        ctrTrend: -29.94,
        budgetStatus: "limitado",
        alerts: [
          "MOF | Advantage — CTR caiu 29,9%",
          "Orçamento limitando conjunto MOF",
          "Conectar CRM ao CAPI → -24% custo/lead",
        ],
      },
      {
        id: "edson",
        name: "Edson Da Hora",
        niche: "Quality Lead · Prospecção",
        score: 86,
        status: "atencao",
        ctrTrend: -8.29,
        budgetStatus: "limitado",
        alerts: [
          "MOF | Advantage — CTR caiu 8,3%",
          "Budget limitando entrega",
          "CRM + CAPI → -24% custo/lead",
        ],
      },
      {
        id: "marquinhos",
        name: "Marquinhos Estilos",
        niche: "Moda Masculina · VSA-PE",
        score: 95,
        status: "critico",
        ctrTrend: -92.22,
        budgetStatus: "ok",
        alerts: [
          "MOF | Polo texturizada — CTR caiu 92,2%",
          "MOF | POLO — CTR caiu 38,8%",
          "MOF | Calça skinny — CTR caiu 34,4%",
          "MOF | 3 Básicas — CTR caiu 25,1%",
        ],
      },
      {
        id: "face",
        name: "Clínica Face e Corpo",
        niche: "Estética · Campo Grande-MS",
        score: null,
        status: "verificar",
        ctrTrend: null,
        budgetStatus: "verificar",
        alerts: [
          "Revisão semanal pendente desde 06/06",
          "Conta aguarda habilitação no Meta MCP",
        ],
      },
      {
        id: "ejetec",
        name: "Ejetec",
        niche: "Soldagem Industrial",
        score: 100,
        status: "verificar",
        ctrTrend: null,
        budgetStatus: "sem dados",
        alerts: ["Sem campanhas ativas no momento"],
      },
      {
        id: "tritao",
        name: "Tritão Náutica",
        niche: "Náutica · Embarcações",
        score: 100,
        status: "verificar",
        ctrTrend: null,
        budgetStatus: "sem dados",
        alerts: ["Sem campanhas ativas no momento"],
      },
      {
        id: "parmegiana",
        name: "Rei da Parmegiana",
        niche: "Restaurante · Delivery",
        score: 100,
        status: "verificar",
        ctrTrend: null,
        budgetStatus: "sem dados",
        alerts: ["Sem campanhas ativas no momento"],
      },
      {
        id: "beatriz",
        name: "Beatriz Lima Nutri",
        niche: "Nutrição · Saúde",
        score: 100,
        status: "verificar",
        ctrTrend: null,
        budgetStatus: "sem dados",
        alerts: ["Sem campanhas ativas no momento"],
      },
    ],
  });
}
