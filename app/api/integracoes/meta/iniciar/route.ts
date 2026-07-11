import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

const GRAPH_VERSION = "v21.0";

export async function GET() {
  const appId = process.env.META_APP_ID;
  const redirectUri = process.env.META_OAUTH_REDIRECT_URI;

  if (!appId || !redirectUri) {
    return NextResponse.json(
      { error: "META_APP_ID / META_OAUTH_REDIRECT_URI não configurados no .env.local" },
      { status: 500 },
    );
  }

  const state = randomBytes(16).toString("hex");

  const authUrl = new URL(`https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`);
  authUrl.searchParams.set("client_id", appId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "ads_read");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("response_type", "code");

  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set("meta_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
