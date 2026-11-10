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

type ConexaoMetaSalva = { access_token: string | null; expires_at: string | null } | null;

// Token de usuário do sistema (META_SYSTEM_USER_TOKEN na Vercel) não expira e vale antes da conexão salva.
export function escolherTokenMeta(
  tokenFixo: string | undefined,
  conexao: ConexaoMetaSalva,
  agora: Date,
): { token: string } | { erro: string } {
  const fixo = tokenFixo?.trim();
  if (fixo) return { token: fixo };
  if (!conexao?.access_token) return { erro: "Conexão Meta indisponível" };
  if (conexao.expires_at && new Date(conexao.expires_at) <= agora) return { erro: "Conexão Meta expirada" };
  return { token: conexao.access_token };
}
