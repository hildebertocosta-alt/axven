import { expect, test, type Page } from "@playwright/test";
import { clienteAnon, lerEstado, type ClienteTeste } from "./apoio/dadosTeste";

// O teste mais importante do Painel: o usuário do cliente A nunca vê nada do
// cliente B, nem pela tela, nem lendo o banco direto com a sessão dele.

// Lido no beforeAll porque os dados só existem depois do globalSetup.
let a: ClienteTeste;
let b: ClienteTeste;
test.beforeAll(() => {
  ({ a, b } = lerEstado());
});

async function entrarNoCrm(page: Page) {
  await page.goto("/crm/login");
  await page.getByPlaceholder("voce@empresa.com").fill(a.usuario.email);
  await page.getByPlaceholder("••••••••").fill(a.usuario.senha);
  await page.getByRole("button", { name: /entrar/i }).click();
  await expect(page).toHaveURL(new RegExp(`/crm/${a.slug}$`));
}

test.describe("isolamento entre clientes", () => {
  test("usuário do A entra direto no CRM do A", async ({ page }) => {
    await entrarNoCrm(page);
    await expect(page.getByText(a.nome).first()).toBeVisible();
  });

  test("usuário do A é barrado no CRM do B", async ({ page }) => {
    await entrarNoCrm(page);
    await page.goto(`/crm/${b.slug}`);
    await expect(page).toHaveURL(/\/crm\/login\?erro=acesso_negado/);
    await expect(page.getByText(b.nome)).toHaveCount(0);
  });

  test("usuário do A é barrado no resultado do B", async ({ page }) => {
    await entrarNoCrm(page);
    await page.goto(`/crm/${b.slug}/resultado`);
    await expect(page).toHaveURL(/\/crm\/login\?erro=acesso_negado/);
  });

  test("com a sessão do A, o banco não entrega nada do B", async () => {
    const supabase = clienteAnon();
    const { error: loginError } = await supabase.auth.signInWithPassword({ email: a.usuario.email, password: a.usuario.senha });
    expect(loginError).toBeNull();

    const { data: leadsB } = await supabase.from("leads").select("id").eq("cliente_id", b.id);
    expect(leadsB ?? []).toHaveLength(0);

    const { data: leadB } = await supabase.from("leads").select("id").eq("id", b.leadId);
    expect(leadB ?? []).toHaveLength(0);

    const { data: vinculosB } = await supabase.from("crm_usuarios").select("user_id").eq("cliente_id", b.id);
    expect(vinculosB ?? []).toHaveLength(0);

    // Controle: o próprio lead o A enxerga (prova que a consulta funciona).
    const { data: leadA } = await supabase.from("leads").select("id").eq("id", a.leadId);
    expect(leadA ?? []).toHaveLength(1);
  });

  test("usuário do A não fecha venda de lead do B pela API do portal", async ({ request }) => {
    const supabase = clienteAnon();
    const { data } = await supabase.auth.signInWithPassword({ email: a.usuario.email, password: a.usuario.senha });
    const token = data.session!.access_token;

    const resposta = await request.post(`/api/crm/leads/${b.leadId}/fechar`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { valor: 1, moeda: "BRL", data_conversao: "2026-10-12T12:00:00-03:00" },
    });
    expect(resposta.ok()).toBe(false);
  });

  test("portal do cliente consegue chamar a API de fechar venda (não é barrado pelo proxy)", async ({ request }) => {
    const supabase = clienteAnon();
    const { data } = await supabase.auth.signInWithPassword({ email: a.usuario.email, password: a.usuario.senha });
    const token = data.session!.access_token;

    // Lead inexistente: a rota deve responder com erro de negócio, e não com o
    // 401 {"error":"unauthorized"} do proxy da área interna.
    const resposta = await request.post("/api/crm/leads/00000000-0000-0000-0000-000000000000/fechar", {
      headers: { Authorization: `Bearer ${token}` },
      data: { valor: 1, moeda: "BRL", data_conversao: "2026-10-12T12:00:00-03:00" },
    });
    const corpo = await resposta.json().catch(() => ({}));
    expect(corpo.error, `proxy barrou o portal: status ${resposta.status()}`).not.toBe("unauthorized");
  });
});
