"use client";

import { useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(payload?.error ?? "Não foi possível entrar.");
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const next = params.get("next") || "/dashboard";
      window.location.assign(next);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-3xl border border-white/10 bg-zinc-950/80 p-8">
        <p className="text-sm font-semibold tracking-[0.2em] text-zinc-400">AXVEN</p>
        <h1 className="mt-1 text-xl font-semibold text-white">Acesso interno</h1>
        <p className="mt-2 text-sm text-zinc-400">Área restrita. Informe a senha para continuar.</p>

        <input
          type="password"
          autoFocus
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Senha"
          className="mt-6 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500"
        />

        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}

        <button
          type="submit"
          disabled={loading || !password}
          className="mt-4 w-full rounded-2xl border border-[#D85A30]/40 bg-[#D85A30] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#c14f28] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
