export const CLIENT_CAMPAIGN_TYPES = ["lead", "ecommerce", "visualizacao"] as const;
export const ACTIVE_CLIENT_PAYMENT_STATUSES = ["em_dia", "pago"] as const;

export type ClientCampaignType = (typeof CLIENT_CAMPAIGN_TYPES)[number];
export type ActiveClientPaymentStatus = (typeof ACTIVE_CLIENT_PAYMENT_STATUSES)[number];

export function parseIntegrationClientInput(body: unknown) {
  const value = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const nome = typeof value.nome === "string" ? value.nome.trim().slice(0, 120) : "";
  const metaAccountId = typeof value.meta_account_id === "string" ? value.meta_account_id.trim() : "";
  const campaignType = typeof value.tipo_campanha === "string" ? value.tipo_campanha : "lead";
  const paymentStatus = typeof value.status_pagamento === "string" ? value.status_pagamento : "em_dia";

  return {
    nome,
    metaAccountId,
    metaAccountIdValid: !metaAccountId || /^\d+$/.test(metaAccountId),
    campaignType: CLIENT_CAMPAIGN_TYPES.includes(campaignType as ClientCampaignType)
      ? campaignType as ClientCampaignType
      : null,
    paymentStatus: ACTIVE_CLIENT_PAYMENT_STATUSES.includes(paymentStatus as ActiveClientPaymentStatus)
      ? paymentStatus as ActiveClientPaymentStatus
      : null,
  };
}
