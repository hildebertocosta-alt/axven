import "server-only";
import { NextRequest, NextResponse } from "next/server";

/**
 * Valida o header x-webhook-secret contra LEADS_WEBHOOK_SECRET.
 * Usado pelos endpoints públicos em /api/webhooks/* que recebem chamadas
 * de fora (Zapier, n8n) e não têm cookie de sessão.
 */
export function validateWebhookSecret(req: NextRequest): NextResponse | null {
  const provided = req.headers.get("x-webhook-secret");
  const expected = process.env.LEADS_WEBHOOK_SECRET;

  if (!expected) {
    return NextResponse.json({ error: "webhook nao configurado" }, { status: 500 });
  }

  if (!provided || provided !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return null;
}
