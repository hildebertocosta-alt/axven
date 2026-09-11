export type MetaSyncStatus = "success" | "partial" | "failed";

export function deriveMetaSyncStatus(attempted: number, failed: number): MetaSyncStatus {
  if (failed === 0) return "success";
  if (attempted > failed) return "partial";
  return "failed";
}

export function isMetaSyncEligible(client: {
  meta_account_id: string | null;
  status_pagamento: string | null;
}) {
  return Boolean(client.meta_account_id) && client.status_pagamento !== "cancelado";
}
