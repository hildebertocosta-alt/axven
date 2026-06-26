"use client";

import { useState } from "react";
import { AppShell } from "../components/dashboard/AppShell";
import { clients } from "../lib/mockData";

const objectives = [
  { value: "conversa-wa", label: "Conversa WA" },
  { value: "lead", label: "Lead" },
  { value: "promo", label: "Promo" },
  { value: "visita", label: "Visita" },
];

export default function CriativosPage() {
  const [client, setClient] = useState(clients[0].name);
  const [objective, setObjective] = useState(objectives[0].value);
  const [context, setContext] = useState("Clínica estética premium com foco em avaliação gratuita.");
  const [variations, setVariations] = useState<Array<{ headline: string; description: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setCopiedIndex(null);
    try {
      const response = await fetch("/api/generate-creative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client,
          objective,
          context,
        }),
      });
      const data = await response.json();
      if (Array.isArray(data?.variations)) {
        setVariations(data.variations);
      } else {
        throw new Error("Invalid response");
      }
    } catch {
      setVariations([
        { headline: "Avaliação gratuita agora", description: "Receba uma análise personalizada para sua necessidade." },
        { headline: "Transforme sua rotina", description: "Descubra o plano ideal com especialistas." },
        { headline: "Oferta por tempo limitado", description: "Aproveite a condição especial de entrada." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (variation: { headline: string; description: string }, index: number) => {
    try {
      await navigator.clipboard.writeText(`${variation.headline}\n${variation.description}`);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1400);
    } catch {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1400);
    }
  };

  return (
    <AppShell title="Criativos" subtitle="Geração de variações com IA" activeLabel="Criativos">
      <div className="space-y-6">
        <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6">
          <h2 className="text-2xl font-semibold text-white">Gerador de anúncios com IA</h2>
          <p className="mt-2 text-sm text-zinc-400">Escolha o cliente, o objetivo e gere 3 variações prontas para teste.</p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6">
            <div className="space-y-4">
              <label className="block text-sm text-zinc-300">
                <span className="mb-2 block">Cliente</span>
                <select value={client} onChange={(event) => setClient(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none">
                  {clients.map((item) => (
                    <option key={item.id} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm text-zinc-300">
                <span className="mb-2 block">Objetivo</span>
                <select value={objective} onChange={(event) => setObjective(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none">
                  {objectives.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm text-zinc-300">
                <span className="mb-2 block">Contexto do produto</span>
                <textarea value={context} onChange={(event) => setContext(event.target.value)} rows={5} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none" />
              </label>

              <button onClick={handleGenerate} className="w-full rounded-2xl bg-violet-600 px-4 py-3 font-semibold text-white transition hover:bg-violet-500">
                {loading ? "Gerando..." : "Gerar com IA"}
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6">
            <h3 className="text-lg font-semibold text-white">Variações sugeridas</h3>
            <div className="mt-4 space-y-3">
              {variations.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-zinc-400">
                  Ainda não há variações geradas. Clique em gerar para criar opções prontas para teste.
                </div>
              )}

              {variations.map((variation, index) => (
                <div key={`${variation.headline}-${index}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-violet-300">Variação {index + 1}</p>
                    <button onClick={() => handleCopy(variation, index)} className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-200">
                      {copiedIndex === index ? "Copiado" : "Copiar"}
                    </button>
                  </div>
                  <p className="mt-2 font-semibold text-white">{variation.headline}</p>
                  <p className="mt-1 text-sm text-zinc-400">{variation.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
