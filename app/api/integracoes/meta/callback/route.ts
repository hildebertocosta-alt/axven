import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { getMetaOAuthRedirectUri, META_OAUTH_STATE_COOKIE, metaOAuthCookieOptions, validateMetaOAuthState } from "@/app/lib/metaOAuth";

const GRAPH_VERSION = "v21.0";

function redirectComStatus(req: NextRequest, status: "conectado" | "erro", detalhe?: string, clearState = false) {
  const url = new URL("/integracoes", req.url);
  url.searchParams.set("status", status);
  if (detalhe) url.searchParams.set("detalhe", detalhe);
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "no-store");
  if (clearState) response.cookies.set(META_OAUTH_STATE_COOKIE, "", { ...metaOAuthCookieOptions(), maxAge: 0 });
  return response;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const stateCookie = req.cookies.get(META_OAUTH_STATE_COOKIE)?.value ?? null;
  if (!code) return redirectComStatus(req, "erro", "codigo_ausente", true);

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret || !process.env.META_OAUTH_REDIRECT_URI) {
    return redirectComStatus(req, "erro", "config_ausente", true);
  }
  if (!validateMetaOAuthState(state, stateCookie, appSecret)) {
    return redirectComStatus(req, "erro", "state_invalido", true);
  }

  let redirectUri: string;
  try {
    redirectUri = getMetaOAuthRedirectUri(process.env.META_OAUTH_REDIRECT_URI);
  } catch {
    return redirectComStatus(req, "erro", "config_ausente", true);
  }

  try {
    const shortLivedUrl = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`);
    shortLivedUrl.searchParams.set("client_id", appId);
    shortLivedUrl.searchParams.set("redirect_uri", redirectUri);
    shortLivedUrl.searchParams.set("client_secret", appSecret);
    shortLivedUrl.searchParams.set("code", code);
    const shortLivedRes = await fetch(shortLivedUrl.toString(), { cache: "no-store" });
    const shortLivedData = await shortLivedRes.json();
    if (!shortLivedRes.ok || !shortLivedData.access_token) {
      return redirectComStatus(req, "erro", "token_curto_falhou", true);
    }

    const longLivedUrl = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`);
    longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
    longLivedUrl.searchParams.set("client_id", appId);
    longLivedUrl.searchParams.set("client_secret", appSecret);
    longLivedUrl.searchParams.set("fb_exchange_token", shortLivedData.access_token);
    const longLivedRes = await fetch(longLivedUrl.toString(), { cache: "no-store" });
    const longLivedData = await longLivedRes.json();
    if (!longLivedRes.ok || !longLivedData.access_token) {
      return redirectComStatus(req, "erro", "token_longo_falhou", true);
    }

    const meUrl = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/me`);
    meUrl.searchParams.set("fields", "id,name");
    const meRes = await fetch(meUrl.toString(), { headers: { Authorization: `Bearer ${longLivedData.access_token}` }, cache: "no-store" });
    const meData = await meRes.json();
    if (!meRes.ok || meData.error) return redirectComStatus(req, "erro", "identidade_falhou", true);

    const expiresAt = longLivedData.expires_in
      ? new Date(Date.now() + longLivedData.expires_in * 1000).toISOString()
      : null;
    const { error } = await supabaseAdmin.from("integracao_meta").insert({
      access_token: longLivedData.access_token,
      token_type: "long_lived_user",
      expires_at: expiresAt,
      meta_user_id: meData.id ?? null,
      meta_user_nome: meData.name ?? null,
    });
    if (error) return redirectComStatus(req, "erro", "banco_falhou", true);

    return redirectComStatus(req, "conectado", undefined, true);
  } catch {
    return redirectComStatus(req, "erro", "excecao", true);
  }
}
