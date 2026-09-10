import { NextRequest, NextResponse } from "next/server";
import { createMetaOAuthState, getMetaOAuthRedirectUri, isOfficialMetaOAuthHost, META_OAUTH_STATE_COOKIE, metaOAuthCookieOptions } from "@/app/lib/metaOAuth";

const GRAPH_VERSION = "v21.0";

export async function GET(req: NextRequest) {
  if (!isOfficialMetaOAuthHost(req.nextUrl.hostname)) {
    return NextResponse.redirect("https://www.axvendigital.com.br/api/integracoes/meta/iniciar");
  }
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret || !process.env.META_OAUTH_REDIRECT_URI) {
    return NextResponse.json({ error: "Configuracao OAuth Meta ausente" }, { status: 500 });
  }

  let redirectUri: string;
  try {
    redirectUri = getMetaOAuthRedirectUri(process.env.META_OAUTH_REDIRECT_URI);
  } catch {
    return NextResponse.json({ error: "Callback OAuth Meta invalido" }, { status: 500 });
  }

  const state = createMetaOAuthState(appSecret);
  const authUrl = new URL(`https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`);
  authUrl.searchParams.set("client_id", appId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "ads_read");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("response_type", "code");

  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set(META_OAUTH_STATE_COOKIE, state, metaOAuthCookieOptions());
  response.headers.set("Cache-Control", "no-store");
  return response;
}
