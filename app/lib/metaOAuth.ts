import crypto from "node:crypto";

export const META_OAUTH_STATE_COOKIE = "meta_oauth_state";
export const META_OAUTH_STATE_TTL_SECONDS = 10 * 60;
export const META_OAUTH_COOKIE_DOMAIN = "axvendigital.com.br";
export const META_OAUTH_CALLBACK_PATH = "/api/integracoes/meta/callback";

const OFFICIAL_HOSTS = new Set(["axvendigital.com.br", "www.axvendigital.com.br"]);

type StatePayload = { nonce: string; exp: number };

function sign(encodedPayload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function createMetaOAuthState(secret: string, now = Date.now()) {
  const payload: StatePayload = {
    nonce: crypto.randomBytes(24).toString("base64url"),
    exp: now + META_OAUTH_STATE_TTL_SECONDS * 1000,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
}

export function validateMetaOAuthState(candidate: string | null, cookieValue: string | null, secret: string, now = Date.now()) {
  if (!candidate || !cookieValue || !safeEqual(candidate, cookieValue)) return false;
  const [encodedPayload, signature, extra] = candidate.split(".");
  if (!encodedPayload || !signature || extra || !safeEqual(signature, sign(encodedPayload, secret))) return false;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Partial<StatePayload>;
    return typeof payload.nonce === "string" && payload.nonce.length >= 20 && typeof payload.exp === "number" && now <= payload.exp;
  } catch {
    return false;
  }
}

export function getMetaOAuthRedirectUri(value: string | undefined) {
  if (!value) throw new Error("META_OAUTH_REDIRECT_URI ausente");
  const url = new URL(value);
  if (url.protocol !== "https:" || !OFFICIAL_HOSTS.has(url.hostname) || url.pathname !== META_OAUTH_CALLBACK_PATH || url.search || url.hash) {
    throw new Error("META_OAUTH_REDIRECT_URI deve usar o callback oficial da Axven");
  }
  return url.toString();
}

export function metaOAuthCookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    maxAge: META_OAUTH_STATE_TTL_SECONDS,
    path: META_OAUTH_CALLBACK_PATH,
    domain: META_OAUTH_COOKIE_DOMAIN,
  };
}
