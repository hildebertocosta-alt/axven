"use client";

import { useEffect, useState } from "react";

export type ConexaoMeta = {
  meta_user_nome: string | null;
  conectado_em: string;
  expires_at: string | null;
};

export type ClienteMetaRow = {
  id: string;
  nome: string;
  meta_account_id: string | null;
};

type ContaMeta = { account_id: string; name: string; business_name?: string };

type NewClientForm = {
  nome: string;
  meta_account_id: string;
  tipo_campanha: "lead" | "ecommerce" | "visualizacao";
  status_pagamento: "em_dia" | "pago";
};

const EMPTY_CLIENT: NewClientForm = {
  nome: "",
  meta_account_id: "",
  tipo_campanha: "lead",
  status_pagamento: "em_dia",
};

const ERRO_MENSAGENS: Record<string, string> = {
  codigo_ausente: "A Meta não retornou o código de autorização. Tenta conectar de novo.",
  state_invalido: "A verificação de segurança do login falhou (state inválido). Tenta conectar de novo.",
  config_ausente: "Faltam variáveis de ambiente (META_APP_ID / META_APP_SECRET / META_OAUTH_REDIRECT_URI) no servidor.",
  token_curto_falhou: "A Meta recusou a troca do código por token. Confere o App Secret.",
  token_longo_falhou: "Não foi possível gerar o token de longa duração.",
  banco_falhou: "O token foi obtido, mas não foi possível salvar no banco.",
  excecao: "Ocorreu um erro inesperado durante a conexão.",
};

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function IntegracoesView({
  conexao,
  conexaoValida,
  conexaoExpirada,
  clientesIniciais,
  statusRedirect,
  detalheRedirect,
}: {
  conexao: ConexaoMeta | null;
  conexaoValida: boolean;
  conexaoExpirada: boolean;
  clientesIniciais: ClienteMetaRow[];
  statusRedirect: string | null;
  detalheRedirect: string | null;
}) {
  const [clientes, setClientes] = useState<ClienteMetaRow[]>(clientesIniciais);
  const [contas, setContas] = useState<ContaMeta[]>([]);
  const [loadingContas, setLoadingContas] = useState(conexaoValida);
  const [selecoes, setSelecoes] = useState<Record<string, string>>(
    Object.fromEntries(clientesIniciais.map((c) => [c.id, c.meta_account_id ?? ""])),
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClient, setNewClient] = useState<NewClientForm>(EMPTY_CLIENT);
  const [creatingClient, setCreatingClient] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (!conexaoValida) return;
    fetch("/api/integracoes/meta/contas")
      .then((res) => res.json())
      .then((payload) => setContas(payload?.contas ?? []))
      .finally(() => setLoadingContas(false));
  }, [conexaoValida]);

  const salvarConta = async (clienteId: string) => {
    setSavingId(clienteId);
    try {
      const response = await fetch("/api/clientes/atualizar-meta-account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: clienteId, meta_account_id: selecoes[clienteId] || null }),
      });
      if (!response.ok) return;
      const payload = await response.json();
      setClientes((prev) => prev.map((c) => (c.id === clienteId ? { ...c, meta_account_id: payload.cliente.meta_account_id } : c)));
    } finally {
      setSavingId(null);
    }
  };

  const criarCliente = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreatingClient(true);
    setCreateError(null);
    try {
      const response = await fetch("/api/clientes/criar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newClient),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setCreateError(payload?.error ?? "Não foi possível criar o cliente.");
        return;
      }

      const created = payload.cliente as ClienteMetaRow;
      setClientes((current) => [...current, created].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")));
      setSelecoes((current) => ({ ...current, [created.id]: created.meta_account_id ?? "" }));
      setNewClient(EMPTY_CLIENT);
      setShowNewClient(false);
    } finally {
      setCreatingClient(false);
    }
  };

  return (
    <div className="space-y-6">
      {statusRedirect === "conectado" ? (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          Conectado com sucesso à Meta.
        </div>
      ) : null}
      {statusRedirect === "erro" ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          Falha ao conectar: {ERRO_MENSAGENS[detalheRedirect ?? ""] ?? "Erro desconhecido."}
        </div>
      ) : null}

      <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Meta Ads</h3>
            {conexao ? (
              <div className="mt-1 space-y-0.5 text-sm text-zinc-400">
                <p>
                  Conectado como <span className="text-white">{conexao.meta_user_nome ?? "conta Meta"}</span>
                </p>
                <p>Desde {formatDate(conexao.conectado_em)}{conexao.expires_at ? ` · expira em ${formatDate(conexao.expires_at)}` : ""}</p>
                {!conexaoValida ? <p className="font-medium text-amber-300">{conexaoExpirada ? "Conexão expirada." : "Conexão indisponível."} Reconecte para consultar a Meta.</p> : null}
              </div>
            ) : (
              <p className="mt-1 text-sm text-zinc-400">
                Nenhuma conexão ativa. Conectando, o hub passa a puxar as contas de anúncio compartilhadas com o Business
                Manager da agência.
              </p>
            )}
          </div>
          <a
            href="/api/integracoes/meta/iniciar"
            className="rounded-2xl border border-[#D85A30]/40 bg-[#D85A30]/10 px-4 py-2 text-sm font-semibold text-[#f0a480] transition hover:bg-[#D85A30]/20"
          >
            {conexao ? "Reconectar" : "Conectar via Meta"}
          </a>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
          <h3 className="text-lg font-semibold text-white">Conta de anúncio por cliente</h3>
          <p className="mt-1 text-sm text-zinc-400">
            {conexao
              ? loadingContas
                ? "Carregando contas de anúncio disponíveis..."
                : `${contas.length} conta(s) de anúncio encontradas na conexão atual.`
              : "Conecte a Meta acima pra escolher as contas de anúncio de cada cliente."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setCreateError(null); setShowNewClient(true); }}
            disabled={!conexaoValida || loadingContas}
            className="rounded-xl border border-[#D85A30]/40 bg-[#D85A30]/10 px-4 py-2 text-sm font-semibold text-[#f0a480] transition hover:bg-[#D85A30]/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Adicionar cliente
          </button>
        </div>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-white/5 text-left text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Conta de anúncio Meta</th>
                <th className="px-4 py-3 font-medium">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 bg-zinc-950/60 text-zinc-200">
              {clientes.map((cliente) => (
                <tr key={cliente.id}>
                  <td className="px-4 py-3 font-medium text-white">{cliente.nome}</td>
                  <td className="px-4 py-3">
                    {conexaoValida ? (
                      <select
                        value={selecoes[cliente.id] ?? ""}
                        onChange={(event) => setSelecoes((prev) => ({ ...prev, [cliente.id]: event.target.value }))}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white outline-none"
                      >
                        <option value="" className="bg-zinc-900 text-white">
                          Sem conta vinculada
                        </option>
                        {contas.map((conta) => (
                          <option key={conta.account_id} value={conta.account_id} className="bg-zinc-900 text-white">
                            {conta.name} {conta.business_name ? `· ${conta.business_name}` : ""}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-zinc-500">{cliente.meta_account_id ?? "—"}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {conexaoValida ? (
                      <button
                        onClick={() => salvarConta(cliente.id)}
                        disabled={savingId === cliente.id}
                        className="rounded-xl border border-[#D85A30]/40 bg-[#D85A30]/10 px-3 py-1.5 text-sm font-semibold text-[#f0a480] transition hover:bg-[#D85A30]/20 disabled:opacity-60"
                      >
                        {savingId === cliente.id ? "Salvando..." : "Salvar"}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showNewClient ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 px-4" role="dialog" aria-modal="true" aria-labelledby="novo-cliente-title">
          <form onSubmit={criarCliente} className="w-full max-w-lg rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="novo-cliente-title" className="text-xl font-semibold text-white">Adicionar cliente</h3>
                <p className="mt-1 text-sm text-zinc-400">Crie o cliente já vinculado a uma conta Meta acessível.</p>
              </div>
              <button type="button" onClick={() => setShowNewClient(false)} className="text-sm text-zinc-500 hover:text-white">Fechar</button>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block text-sm text-zinc-300">
                Nome do cliente
                <input required maxLength={120} value={newClient.nome} onChange={(event) => setNewClient((current) => ({ ...current, nome: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none focus:border-[#D85A30]/50" />
              </label>
              <label className="block text-sm text-zinc-300">
                Conta de anúncio Meta
                <select required value={newClient.meta_account_id} onChange={(event) => setNewClient((current) => ({ ...current, meta_account_id: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-white outline-none focus:border-[#D85A30]/50">
                  <option value="">Selecione uma conta</option>
                  {contas.map((conta) => (
                    <option key={conta.account_id} value={conta.account_id}>
                      {conta.name}{conta.business_name ? ` · ${conta.business_name}` : ""} · ID {conta.account_id}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm text-zinc-300">
                  Tipo de campanha
                  <select value={newClient.tipo_campanha} onChange={(event) => setNewClient((current) => ({ ...current, tipo_campanha: event.target.value as NewClientForm["tipo_campanha"] }))} className="mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-white outline-none">
                    <option value="lead">Leads</option>
                    <option value="ecommerce">E-commerce</option>
                    <option value="visualizacao">Visualização</option>
                  </select>
                </label>
                <label className="block text-sm text-zinc-300">
                  Status
                  <select value={newClient.status_pagamento} onChange={(event) => setNewClient((current) => ({ ...current, status_pagamento: event.target.value as NewClientForm["status_pagamento"] }))} className="mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-white outline-none">
                    <option value="em_dia">Ativo · Em dia</option>
                    <option value="pago">Ativo · Pago</option>
                  </select>
                </label>
              </div>
              {createError ? <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{createError}</p> : null}
            </div>

            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setShowNewClient(false)} className="flex-1 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-zinc-300">Cancelar</button>
              <button disabled={creatingClient} className="flex-1 rounded-xl bg-[#D85A30] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{creatingClient ? "Criando..." : "Criar cliente"}</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
