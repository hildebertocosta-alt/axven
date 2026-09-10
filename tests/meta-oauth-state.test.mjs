import assert from "node:assert/strict";
import test from "node:test";
import {
  createMetaOAuthState,
  getMetaOAuthRedirectUri,
  META_OAUTH_CALLBACK_PATH,
  META_OAUTH_COOKIE_DOMAIN,
  META_OAUTH_STATE_TTL_SECONDS,
  metaOAuthCookieOptions,
  validateMetaOAuthState,
} from "../app/lib/metaOAuth.ts";

const SECRET = "test-only-secret-with-enough-entropy";
const NOW = Date.UTC(2026, 8, 10, 12);

test("state correto é aceito e configuração do cookie cobre somente o domínio oficial", () => {
  const state = createMetaOAuthState(SECRET, NOW);
  assert.equal(validateMetaOAuthState(state, state, SECRET, NOW + 1_000), true);
  assert.deepEqual(metaOAuthCookieOptions(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: META_OAUTH_STATE_TTL_SECONDS,
    path: META_OAUTH_CALLBACK_PATH,
    domain: META_OAUTH_COOKIE_DOMAIN,
  });
});

test("state diferente ou ausente é rejeitado", () => {
  const state = createMetaOAuthState(SECRET, NOW);
  const different = createMetaOAuthState(SECRET, NOW);
  assert.equal(validateMetaOAuthState(state, different, SECRET, NOW), false);
  assert.equal(validateMetaOAuthState(null, state, SECRET, NOW), false);
  assert.equal(validateMetaOAuthState(state, null, SECRET, NOW), false);
});

test("state expirado é rejeitado", () => {
  const state = createMetaOAuthState(SECRET, NOW);
  assert.equal(validateMetaOAuthState(state, state, SECRET, NOW + META_OAUTH_STATE_TTL_SECONDS * 1_000 + 1), false);
});

test("callback consumido não pode ser reutilizado sem o cookie", () => {
  const state = createMetaOAuthState(SECRET, NOW);
  assert.equal(validateMetaOAuthState(state, state, SECRET, NOW), true);
  assert.equal(validateMetaOAuthState(state, null, SECRET, NOW), false);
});

test("redirect URI aceita apenas o callback HTTPS do domínio oficial", () => {
  assert.equal(getMetaOAuthRedirectUri("https://axvendigital.com.br/api/integracoes/meta/callback"), "https://axvendigital.com.br/api/integracoes/meta/callback");
  assert.equal(getMetaOAuthRedirectUri("https://www.axvendigital.com.br/api/integracoes/meta/callback"), "https://www.axvendigital.com.br/api/integracoes/meta/callback");
  assert.throws(() => getMetaOAuthRedirectUri("https://axven.vercel.app/api/integracoes/meta/callback"));
  assert.throws(() => getMetaOAuthRedirectUri("https://preview.example/api/integracoes/meta/callback"));
});
