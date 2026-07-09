"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";

export function LoginForm({ initialError }: { initialError: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState<string | null>(initialError);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password: senha });

    if (signInError || !data.user) {
      setError("Email ou senha inválidos.");
      setLoading(false);
      return;
    }

    const { data: vinculo } = await supabase
      .from("crm_usuarios")
      .select("cliente_id")
      .eq("user_id", data.user.id)
      .single();

    if (!vinculo) {
      setError("Este usuário não está vinculado a nenhum cliente. Fale com o administrador.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    const { data: cliente } = await supabase.from("clientes").select("slug").eq("id", vinculo.cliente_id).single();

    if (!cliente) {
      setError("Cliente vinculado não encontrado.");
      setLoading(false);
      return;
    }

    router.push(`/crm/${cliente.slug}`);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] px-4 text-zinc-100">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-zinc-950/80 p-8">
        <p className="text-sm font-medium text-violet-300">CRM</p>
        <h1 className="mt-2 text-2xl font-semibold text-white">Entrar</h1>
        <p className="mt-2 text-sm text-zinc-400">Acesse o kanban de leads do seu cliente.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-xs font-medium text-zinc-400">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-violet-500/50"
              placeholder="voce@empresa.com"
            />
          </div>

          <div>
            <label htmlFor="senha" className="mb-1 block text-xs font-medium text-zinc-400">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              required
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-violet-500/50"
              placeholder="••••••••"
            />
          </div>

          {error ? (
            <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-200">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
