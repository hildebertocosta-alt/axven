"use client";

import { useEffect, useState } from "react";

const initialText =
  "Prioridades de crescimento para hoje: revisar criativos de alta conversão, revisar budget em clientes em ajuste e manter o ritmo de respostas em lead flow.";

const faceAndBodyContext =
  "Face e Corpo tem 2 conjuntos de anúncios ativos desde 26/06/2026 com 4 procedimentos (Botox R$597, Preenchimento Labial R$697, Endolaser R$797, Glúteo R$4.497) e R$50/dia no total. Análise agendada para 29/06/2026 — comparar qual conjunto e criativo está performando melhor.";

function getAlertState(date = new Date()) {
  const today = new Date(date);
  today.setHours(0, 0, 0, 0);

  const analysisDate = new Date(2026, 5, 29);
  analysisDate.setHours(0, 0, 0, 0);

  const diffDays = Math.round((analysisDate.getTime() - today.getTime()) / 86_400_000);

  if (diffDays <= 0) {
    return {
      kind: "danger" as const,
      text: "⚠️ ANÁLISE PENDENTE — Face e Corpo: verificar performance dos 2 conjuntos de anúncios",
    };
  }

  if (diffDays === 1) {
    return {
      kind: "warning" as const,
      text: "⏰ Amanhã: analisar campanhas da Face e Corpo",
    };
  }

  return null;
}

export function AiPriorityBanner() {
  const [text, setText] = useState(initialText);
  const [loading, setLoading] = useState(true);
  const [alertState, setAlertState] = useState<ReturnType<typeof getAlertState>>(null);

  useEffect(() => {
    setAlertState(getAlertState());

    const load = async () => {
      try {
        const response = await fetch("/api/anthropic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: `Crie uma mensagem curta de prioridades operacionais para uma agência de tráfego pago em português, com foco em clientes, orçamento e criativos. Use este contexto fixo da Face e Corpo: ${faceAndBodyContext}. Responda em 1 parágrafo curto e inclua um alerta operacional breve.`,
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

      <div className="mt-4 space-y-3">
        <p className="max-w-3xl text-sm leading-6 text-zinc-300">{faceAndBodyContext}</p>

        {alertState ? (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
              alertState.kind === "danger"
                ? "border-red-500/30 bg-red-500/10 text-red-200"
                : "border-amber-500/30 bg-amber-500/10 text-amber-200"
            }`}
          >
            {alertState.text}
          </div>
        ) : null}

        <p className="max-w-3xl text-sm leading-6 text-zinc-300">{text}</p>
      </div>
    </div>
  );
}
