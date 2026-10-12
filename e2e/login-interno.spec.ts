import { expect, test } from "@playwright/test";

test("senha errada não entra no painel interno", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Senha").fill("senha-errada");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Senha incorreta")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("senha certa entra e volta para a página pedida", async ({ page }) => {
  await page.goto("/clientes");
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.getByPlaceholder("Senha").fill(process.env.AUTH_PASSWORD!);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/clientes$/);
});
