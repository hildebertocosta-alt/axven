# Testes de navegador (Playwright)

Abrem o Painel num navegador de verdade e conferem login, bloqueios e o
isolamento entre clientes.

## Rodar

```bash
npm run test:e2e
```

Sobe o `next dev` na porta 3100 sozinho (ou reaproveita um que já esteja
rodando nela). Relatório da última rodada: `npm run test:e2e:relatorio`.

## O que precisa no `.env.local`

| Variável | De onde vem |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | públicas do projeto Supabase "Axven" |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase › Project Settings › API keys (secreta, nunca commitar) |
| `AUTH_PASSWORD`, `AUTH_SECRET` | valores **só locais** (não são os da produção) |

## Dados de teste

O banco é o de produção, então cada rodada:

1. apaga sobras de rodadas anteriores (`clientes.slug` começando com `teste-e2e-` e usuários `@axven-e2e.test`);
2. cria os clientes `TESTE E2E Isolamento A` e `B`, um usuário de portal para cada (senha aleatória, guardada só em `e2e/.estado/` durante a rodada) e um lead `plataforma = 'teste'` em cada;
3. roda os testes;
4. apaga tudo de novo.

Os clientes de teste não têm honorários nem conta Meta, então não geram cobrança
nem entram no sync de mídia. Se uma rodada for interrompida no meio, a próxima limpa.

## Arquivos

- `acesso-publico.spec.ts`: sem login não entra em página interna, API interna ou CRM.
- `login-interno.spec.ts`: senha errada barra, senha certa entra.
- `isolamento-clientes.spec.ts`: o usuário do cliente A não vê o B pela tela, pelo banco nem pela API do portal.
