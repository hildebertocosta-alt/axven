import { expect, test } from "@playwright/test";

// Quem não está logado não entra em nada interno nem no CRM de cliente.

const PAGINAS_INTERNAS = ["/dashboard", "/clientes", "/financeiro", "/integracoes", "/relatorios"];

for (const pagina of PAGINAS_INTERNAS) {
  test(`sem login, ${pagina} manda para /login`, async ({ page }) => {
    await page.goto(pagina);
    await expect(page).toHaveURL(new RegExp(`/login\\?next=${pagina.replace("/", "%2F")}`));
  });
}

test("sem login, API interna responde 401", async ({ request }) => {
  const resposta = await request.get("/api/financeiro/data");
  expect(resposta.status()).toBe(401);
});

test("sem login, API do CRM interno da Axven responde 401", async ({ request }) => {
  const resposta = await request.patch("/api/crm/axven/leads/atualizar-etapa", { data: {} });
  expect(resposta.status()).toBe(401);
});

test("sem token, API do portal responde 401 da própria rota", async ({ request }) => {
  const resposta = await request.post("/api/crm/leads/00000000-0000-0000-0000-000000000000/fechar", { data: {} });
  expect(resposta.status()).toBe(401);
  expect((await resposta.json()).error).toBe("não autenticado");
});

test("sem login, CRM de cliente manda para /crm/login", async ({ page }) => {
  await page.goto("/crm/teste-e2e-a");
  await expect(page).toHaveURL(/\/crm\/login/);
});
