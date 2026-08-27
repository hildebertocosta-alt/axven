import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

const GRAPH_VERSION = "v21.0";

async function getToken() {
  const { data } = await supabaseAdmin
    .from("integracao_meta")
    .select("access_token")
    .order("conectado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.access_token ?? null;
}

export async function GET(req: NextRequest) {
  const clienteId = req.nextUrl.searchParams.get("cliente_id");
  if (!clienteId) return NextResponse.json({ error: "cliente_id obrigatório" }, { status: 400 });

  const { data: cliente, error: clienteError } = await supabaseAdmin
    .from("clientes")
    .select("id,nome,meta_account_id")
    .eq("id", clienteId)
    .single();
  if (clienteError || !cliente) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });

  const token = await getToken();
  if (!token) return NextResponse.json({ error: "Nenhuma conexão Meta ativa" }, { status: 400 });

  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/me/adaccounts?fields=account_id,name,business_name&limit=200&access_token=${encodeURIComponent(token)}`, { cache: "no-store" });
  const payload = await res.json();
  if (!res.ok || payload.error) return NextResponse.json({ error: payload?.error?.message ?? "Erro ao buscar contas Meta" }, { status: 502 });

  return NextResponse.json({ cliente, contas: payload.data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const { cliente_id, account_id } = await req.json();
  if (!cliente_id || !account_id) return NextResponse.json({ error: "cliente_id e account_id são obrigatórios" }, { status: 400 });

  const token = await getToken();
  if (!token) return NextResponse.json({ error: "Nenhuma conexão Meta ativa" }, { status: 400 });

  const contasRes = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/me/adaccounts?fields=account_id,name&limit=200&access_token=${encodeURIComponent(token)}`, { cache: "no-store" });
  const contasPayload = await contasRes.json();
  const conta = (contasPayload.data ?? []).find((item: { account_id: string }) => item.account_id === String(account_id));
  if (!conta) return NextResponse.json({ error: "Conta de anúncios não disponível nesta conexão Meta" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("clientes")
    .update({ meta_account_id: String(account_id) })
    .eq("id", cliente_id)
    .select("id,nome,meta_account_id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ cliente: data, conta });
}
