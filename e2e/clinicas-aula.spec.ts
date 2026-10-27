import { expect, test } from "@playwright/test";

// Página pública da aula ao vivo. O POST da inscrição é interceptado aqui (mock):
// nenhum lead de teste chega ao banco de produção.

test.use({ viewport: { width: 375, height: 812 } });

test("sem login, /clinicas/aula abre com o topo na primeira tela", async ({ page }) => {
  await page.goto("/clinicas/aula");
  await expect(page).toHaveURL(/\/clinicas\/aula$/);
  await expect(page).toHaveTitle("Aula ao vivo para clínicas de estética | Axven Digital");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Como saber quais anúncios viram paciente pagante na sua clínica");
  await expect(page.getByText("Aula ao vivo e gratuita · quarta, 18/11, às 19h30 · online")).toBeVisible();
  const botao = page.getByRole("link", { name: "Quero participar" });
  await expect(botao).toBeInViewport();
  await expect(page.getByText("Dados medidos em um cliente da Axven. Não é promessa de resultado.")).toBeAttached();
  const larguraDoc = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(larguraDoc).toBeLessThanOrEqual(375);
});

test("inscrição valida os 3 campos e mostra o passo seguinte", async ({ page }) => {
  const enviados: Record<string, unknown>[] = [];
  await page.route("**/api/aquisicao/clinicas", async (route) => {
    enviados.push(route.request().postDataJSON());
    await route.fulfill({ json: { id: "00000000-0000-4000-8000-000000000000", qualified: false, stage: "lead", meta_event_id: "axven_lead_00000000-0000-4000-8000-000000000000", landingPage: "/clinicas/aula", idempotent: false } });
  });

  await page.goto("/clinicas/aula?utm_source=teste-e2e&utm_campaign=aula");
  const form = page.getByRole("form", { name: "Inscrição na aula" });
  const enviar = form.getByRole("button", { name: "Garantir minha vaga" });

  await enviar.click();
  await expect(form.getByText("Informe seu nome.")).toBeVisible();
  await expect(form.getByText(/Informe um celular com DDD/)).toBeVisible();
  await expect(form.getByText("Informe o nome da clínica.")).toBeVisible();
  expect(enviados).toHaveLength(0);

  await form.getByLabel("Seu nome").fill("Teste E2E");
  await form.getByLabel("Seu WhatsApp").fill("81999999999");
  await expect(form.getByLabel("Seu WhatsApp")).toHaveValue("(81) 99999-9999");
  await form.getByLabel("Nome da clínica").fill("Clínica Teste E2E");
  await enviar.click();

  const proximo = page.getByTestId("aula-proximo-passo");
  await expect(proximo.getByRole("heading", { name: "Falta 1 passo: entre na comunidade da aula" })).toBeVisible();
  await expect(proximo.getByText("Você vai receber o link da comunidade no seu WhatsApp.")).toBeVisible();
  await expect(proximo.getByRole("link", { name: "Salvar na agenda" })).toHaveAttribute("href", /calendar\.google\.com.*20261118T193000%2F20261118T204500.*America%2FRecife/);

  expect(enviados).toHaveLength(1);
  expect(enviados[0]).toMatchObject({ landing: "clinicas-aula", name: "Teste E2E", whatsapp: "(81) 99999-9999", clinic: "Clínica Teste E2E", utm_source: "teste-e2e", utm_campaign: "aula" });
});
