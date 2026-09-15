import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/app/lib/authSession";
import { parseIntegrationClientInput } from "@/app/lib/clientCreation";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

const GRAPH_VERSION = "v21.0";

async function metaAccountIsAccessible(accountId: string, accessToken: string) {
  try {
    const params = new URLSearchParams({ fields: "account_id" });
    const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/act_${accountId}?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!response.ok) return false;
    const payload = await response.json() as { account_id?: string };
    return payload.account_id === accountId;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!verifySessionToken(token)) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const { nome, metaAccountId, metaAccountIdValid, campaignType, paymentStatus } = parseIntegrationClientInput(body);
  if (!nome) return NextResponse.json({ error: "nome obrigatório" }, { status: 400 });
  if (!metaAccountIdValid) return NextResponse.json({ error: "conta Meta inválida" }, { status: 400 });
  if (!campaignType) return NextResponse.json({ error: "tipo de campanha inválido" }, { status: 400 });
  if (!paymentStatus) return NextResponse.json({ error: "status inválido" }, { status: 400 });

  const nicho = typeof body?.nicho === "string" && body.nicho.trim() ? body.nicho.trim() : null;
  const telefone = typeof body?.telefone === "string" && body.telefone.trim() ? body.telefone.replace(/\D/g, "") : null;
  const honorarios = typeof body?.honorarios === "number" && body.honorarios > 0 ? body.honorarios : null;
  const diaPagamento =
    typeof body?.dia_pagamento === "number" && body.dia_pagamento >= 1 && body.dia_pagamento <= 31
      ? body.dia_pagamento
      : 5;

  if (metaAccountId) {
    const [{ data: duplicate, error: duplicateError }, { data: connection, error: connectionError }] = await Promise.all([
      supabaseAdmin.from("clientes").select("id").eq("meta_account_id", metaAccountId).limit(1).maybeSingle(),
      supabaseAdmin
        .from("integracao_meta")
        .select("access_token,expires_at")
        .order("conectado_em", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (duplicateError || connectionError) {
      return NextResponse.json({ error: "não foi possível validar a conta Meta" }, { status: 500 });
    }

    if (duplicate) {
      return NextResponse.json({ error: "conta Meta já vinculada a outro cliente" }, { status: 409 });
    }
    if (!connection?.access_token || (connection.expires_at && new Date(connection.expires_at) <= new Date())) {
      return NextResponse.json({ error: "conexão Meta indisponível" }, { status: 409 });
    }
    if (!(await metaAccountIsAccessible(metaAccountId, connection.access_token))) {
      return NextResponse.json({ error: "conta Meta não acessível pela conexão atual" }, { status: 400 });
    }
  }

  const { data, error } = await supabaseAdmin
    .from("clientes")
    .insert({
      nome,
      nicho,
      telefone,
      honorarios,
      dia_pagamento: diaPagamento,
      status: "verificar",
      status_pagamento: paymentStatus,
      tipo_campanha: campaignType,
      meta_account_id: metaAccountId || null,
    })
    .select("id, nome, nicho, telefone, score, status, status_pagamento, tipo_campanha, meta_account_id, honorarios, data_fim_contrato")
    .single();

  if (error) return NextResponse.json({ error: "não foi possível criar o cliente" }, { status: 500 });
  return NextResponse.json({ cliente: data });
}
