"use client";

import { useEffect, useState } from "react";

const initialText =
  "Prioridades de crescimento para hoje: revisar criativos de alta conversão, revisar budget em clientes em ajuste e manter o ritmo de respostas em lead flow.";

export function AiPriorityBanner() {
  const [text, setText] = useState(initialText);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/anthropic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt:
              "Crie uma mensagem curta de prioridades operacionais para uma agência de tráfego pago em português, com foco em clientes, orçamento e criativos.",
          }),
        });

        const data = await response.json();
        if (data?.text) {
          setText(data.text);
        }
      } catch {
        setText(initialText);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div className="rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-600/20 via-violet-500/5 to-zinc-950 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-violet-300">Banner de prioridades · IA</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Resumo operacional</h3>
        </div>
        <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-violet-200">
          {loading ? "Gerando" : "Atualizado"}
        </span>
      </div>
      <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-300">{text}</p>
    </div>
  );
}
