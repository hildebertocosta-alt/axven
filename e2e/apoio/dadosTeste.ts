import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Dados criados só para os testes de isolamento. Tudo que tem este prefixo é
// apagado antes e depois de cada rodada; nada de cliente real usa "teste-e2e-".
export const PREFIXO_SLUG = "teste-e2e-";
const DOMINIO_EMAIL = "axven-e2e.test";
const ARQUIVO_ESTADO = path.join(__dirname, "..", ".estado", "dados.json");

export type UsuarioTeste = { email: string; senha: string; userId: string };
export type ClienteTeste = { id: string; slug: string; nome: string; usuario: UsuarioTeste; leadId: string };
export type EstadoTeste = { a: ClienteTeste; b: ClienteTeste };

function exigirEnv(nome: string): string {
  const valor = process.env[nome];
  if (!valor) {
    throw new Error(`${nome} vazio no .env.local. Os testes E2E precisam dele (ver e2e/README.md).`);
  }
  return valor;
}

export function clienteAdmin(): SupabaseClient {
  return createClient(exigirEnv("NEXT_PUBLIC_SUPABASE_URL"), exigirEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function clienteAnon(): SupabaseClient {
  return createClient(exigirEnv("NEXT_PUBLIC_SUPABASE_URL"), exigirEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function falhar<T>(promessa: PromiseLike<{ data: T; error: { message: string } | null }>, etapa: string): Promise<T> {
  const { data, error } = await promessa;
  if (error) throw new Error(`${etapa}: ${error.message}`);
  return data;
}

export async function limparDadosDeTeste(admin: SupabaseClient) {
  const clientes = await falhar(
    admin.from("clientes").select("id").like("slug", `${PREFIXO_SLUG}%`),
    "listar clientes de teste",
  );
  const ids = (clientes ?? []).map((c: { id: string }) => c.id);
  if (ids.length) {
    await falhar(admin.from("lead_etapa_eventos").delete().in("cliente_id", ids), "apagar eventos de etapa");
    await falhar(admin.from("leads").delete().in("cliente_id", ids), "apagar leads de teste");
    await falhar(admin.from("crm_usuarios").delete().in("cliente_id", ids), "apagar vínculos de teste");
    await falhar(admin.from("financeiro").delete().in("cliente_id", ids), "apagar financeiro de teste");
    await falhar(admin.from("clientes").delete().in("id", ids), "apagar clientes de teste");
  }

  for (let pagina = 1; pagina < 50; pagina++) {
    const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: 200 });
    if (error) throw new Error(`listar usuários: ${error.message}`);
    for (const user of data.users) {
      if (user.email?.endsWith(`@${DOMINIO_EMAIL}`)) {
        const { error: delError } = await admin.auth.admin.deleteUser(user.id);
        if (delError) throw new Error(`apagar usuário de teste: ${delError.message}`);
      }
    }
    if (data.users.length < 200) break;
  }
}

async function criarCliente(admin: SupabaseClient, letra: "a" | "b"): Promise<ClienteTeste> {
  const slug = `${PREFIXO_SLUG}${letra}`;
  const nome = `TESTE E2E Isolamento ${letra.toUpperCase()}`;

  // Sem honorários e sem conta Meta: não gera cobrança nem entra no sync de mídia.
  const cliente = await falhar(
    admin.from("clientes").insert({ nome, slug, status_pagamento: "em_dia", honorarios: null }).select("id").single(),
    `criar cliente ${letra}`,
  );

  const email = `${slug}@${DOMINIO_EMAIL}`;
  const senha = randomBytes(18).toString("base64url");
  const { data: criado, error } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true });
  if (error || !criado.user) throw new Error(`criar usuário ${letra}: ${error?.message}`);

  await falhar(
    admin.from("crm_usuarios").insert({ user_id: criado.user.id, cliente_id: cliente.id, nome: `Atendente ${nome}` }),
    `vincular usuário ${letra}`,
  );

  // plataforma "teste" é escondida das telas (semLeadsDeTeste), mas existe no banco
  // para provar que o outro cliente não consegue ler este lead.
  const lead = await falhar(
    admin.from("leads").insert({ nome: `Lead E2E ${letra.toUpperCase()}`, cliente_id: cliente.id, plataforma: "teste" }).select("id").single(),
    `criar lead ${letra}`,
  );

  return { id: cliente.id, slug, nome, usuario: { email, senha, userId: criado.user.id }, leadId: lead.id };
}

export async function criarDadosDeTeste(admin: SupabaseClient): Promise<EstadoTeste> {
  await limparDadosDeTeste(admin);
  const estado = { a: await criarCliente(admin, "a"), b: await criarCliente(admin, "b") };
  mkdirSync(path.dirname(ARQUIVO_ESTADO), { recursive: true });
  writeFileSync(ARQUIVO_ESTADO, JSON.stringify(estado, null, 2));
  return estado;
}

export function lerEstado(): EstadoTeste {
  return JSON.parse(readFileSync(ARQUIVO_ESTADO, "utf8")) as EstadoTeste;
}

export function apagarEstado() {
  rmSync(path.dirname(ARQUIVO_ESTADO), { recursive: true, force: true });
}
