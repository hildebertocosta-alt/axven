import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

const GRAPH_VERSION = "v21.0";

export async function GET() {
  const { data: conexao } = await supabaseAdmin
    .from("integracao_meta")
    .select("access_token")
    .order("conectado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conexao?.access_token) {
    return NextResponse.json({ error: "Nenhuma conexão Meta ativa" }, { status: 400 });
  }

  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/me/adaccounts?fields=account_id,name,business_name&limit=200&access_token=${conexao.access_token}`,
  );
  const data = await res.json();

  if (data.error) {
    return NextResponse.json({ error: data.error.message ?? "Erro ao buscar contas de anúncio" }, { status: 502 });
  }

  return NextResponse.json({ contas: data.data ?? [] });
}
