import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

const GRAPH_VERSION = "v21.0";

function redirectComStatus(req: NextRequest, status: "conectado" | "erro", detalhe?: string) {
  const url = new URL("/integracoes", req.url);
  url.searchParams.set("status", status);
  if (detalhe) url.searchParams.set("detalhe", detalhe);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const stateCookie = req.cookies.get("meta_oauth_state")?.value;

  if (!code) return redirectComStatus(req, "erro", "codigo_ausente");
  if (!state || !stateCookie || state !== stateCookie) return redirectComStatus(req, "erro", "state_invalido");

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const redirectUri = process.env.META_OAUTH_REDIRECT_URI;

  if (!appId || !appSecret || !redirectUri) {
    return redirectComStatus(req, "erro", "config_ausente");
  }

  try {
    // 1) troca o code por um token de curta duração
    const shortLivedUrl = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`);
    shortLivedUrl.searchParams.set("client_id", appId);
    shortLivedUrl.searchParams.set("redirect_uri", redirectUri);
    shortLivedUrl.searchParams.set("client_secret", appSecret);
    shortLivedUrl.searchParams.set("code", code);

    const shortLivedRes = await fetch(shortLivedUrl.toString());
    const shortLivedData = await shortLivedRes.json();
    if (!shortLivedData.access_token) {
      return redirectComStatus(req, "erro", "token_curto_falhou");
    }

    // 2) troca o token de curta duração por um de longa duração (~60 dias)
    const longLivedUrl = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`);
    longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
    longLivedUrl.searchParams.set("client_id", appId);
    longLivedUrl.searchParams.set("client_secret", appSecret);
    longLivedUrl.searchParams.set("fb_exchange_token", shortLivedData.access_token);

    const longLivedRes = await fetch(longLivedUrl.toString());
    const longLivedData = await longLivedRes.json();
    if (!longLivedData.access_token) {
      return redirectComStatus(req, "erro", "token_longo_falhou");
    }

    const expiresAt = longLivedData.expires_in
      ? new Date(Date.now() + longLivedData.expires_in * 1000).toISOString()
      : null;

    // 3) identifica quem conectou
    const meRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/me?fields=id,name&access_token=${longLivedData.access_token}`,
    );
    const meData = await meRes.json();

    // Conexão é única por agência — substitui a anterior se existir.
    await supabaseAdmin.from("integracao_meta").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    const { error } = await supabaseAdmin.from("integracao_meta").insert({
      access_token: longLivedData.access_token,
      token_type: "long_lived_user",
      expires_at: expiresAt,
      meta_user_id: meData?.id ?? null,
      meta_user_nome: meData?.name ?? null,
    });

    if (error) return redirectComStatus(req, "erro", "banco_falhou");

    const response = redirectComStatus(req, "conectado");
    response.cookies.delete("meta_oauth_state");
    return response;
  } catch {
    return redirectComStatus(req, "erro", "excecao");
  }
}
