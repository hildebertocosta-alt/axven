import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

const GRAPH_VERSION = "v21.0";

export async function GET() {
  const { data: conexao } = await supabaseAdmin
    .from("integracao_meta")
    .select("access_token,expires_at")
    .order("conectado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conexao?.access_token) {
    return NextResponse.json({ error: "Nenhuma conexão Meta disponível" }, { status: 400 });
  }
  if (conexao.expires_at && new Date(conexao.expires_at) <= new Date()) {
    return NextResponse.json({ error: "Conexão Meta expirada" }, { status: 401 });
  }

  const params = new URLSearchParams({ fields: "account_id,name,business_name", limit: "200" });
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/me/adaccounts?${params}`, {
    headers: { Authorization: `Bearer ${conexao.access_token}` },
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    return NextResponse.json({ error: "Não foi possível carregar as contas Meta" }, { status: 502 });
  }

  return NextResponse.json({ contas: data.data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}
