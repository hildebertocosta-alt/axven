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
  clientesIniciais,
  statusRedirect,
  detalheRedirect,
}: {
  conexao: ConexaoMeta | null;
  clientesIniciais: ClienteMetaRow[];
  statusRedirect: string | null;
  detalheRedirect: string | null;
}) {
  const [clientes, setClientes] = useState<ClienteMetaRow[]>(clientesIniciais);
  const [contas, setContas] = useState<ContaMeta[]>([]);
  const [loadingContas, setLoadingContas] = useState(!!conexao);
  const [selecoes, setSelecoes] = useState<Record<string, string>>(
    Object.fromEntries(clientesIniciais.map((c) => [c.id, c.meta_account_id ?? ""])),
  );
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!conexao) return;
    fetch("/api/integracoes/meta/contas")
      .then((res) => res.json())
      .then((payload) => setContas(payload?.contas ?? []))
      .finally(() => setLoadingContas(false));
  }, [conexao]);

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
                    {conexao ? (
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
                    {conexao ? (
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
    </div>
  );
}
