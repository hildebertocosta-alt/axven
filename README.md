This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Meta Ads sync automático

O endpoint manual `POST /api/relatorios/meta-sync` permanece protegido pela sessão interna.
O agendamento diário usa `GET /api/cron/meta-sync`, autenticado exclusivamente por
`Authorization: Bearer $CRON_SECRET`, e sincroniza a janela D-7 até ontem no timezone
`America/Sao_Paulo`.

Clientes são selecionados dinamicamente quando possuem `meta_account_id` e não estão
com `status_pagamento = 'cancelado'`. O campo `status` não é usado como filtro porque
atualmente representa saúde operacional (`ativo`, `alerta` ou `verificar`), não uma
regra confiável de elegibilidade.

A concorrência é impedida por índice único parcial para a mesma janela enquanto o run
está `running`. Execuções abandonadas há mais de duas horas são encerradas como
`failed` antes da aquisição de uma nova trava. Resultados e falhas sanitizadas são
registrados em `meta_ads_sync_runs` e `meta_ads_sync_run_items`; nenhuma credencial é
persistida nessas tabelas.
