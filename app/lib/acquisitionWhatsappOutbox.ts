export const OUTBOX_MAX_ATTEMPTS = 5;
export const OUTBOX_RETRY_DELAY_MINUTES = 5;
export const OUTBOX_PROCESSING_LEASE_MINUTES = 10;

export type UazapiAcceptance = {
  accepted: boolean;
  provider_message_id: string | null;
};

export function normalizeUazapiAcceptance(payload: unknown): UazapiAcceptance {
  const messageId = payload && typeof payload === "object" && typeof (payload as Record<string, unknown>).messageid === "string"
    ? ((payload as Record<string, unknown>).messageid as string).trim()
    : "";
  return { accepted: messageId.length > 0, provider_message_id: messageId || null };
}

export function validProviderMessageId(value: unknown): value is string {
  return typeof value === "string"
    && value.trim() === value
    && value.length > 0
    && value.length <= 255
    && !/[\u0000-\u001f\u007f]/.test(value);
}

export function sanitizeOutboxError(value: unknown): string {
  if (typeof value !== "string") return "falha_no_envio";
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
  const allowed = new Set([
    "dados_outbox_invalidos",
    "uazapi_envio_falhou",
    "uazapi_resposta_invalida",
    "timeout_uazapi",
    "resultado_ambiguo_provider",
  ]);
  return allowed.has(normalized) ? normalized : "falha_no_envio";
}

export function failureTransition(attempts: number, now = new Date()) {
  const exhausted = attempts >= OUTBOX_MAX_ATTEMPTS;
  return {
    status: "falhou" as const,
    disponivel_em: exhausted
      ? now.toISOString()
      : new Date(now.getTime() + OUTBOX_RETRY_DELAY_MINUTES * 60_000).toISOString(),
    exhausted,
  };
}
