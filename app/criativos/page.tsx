"use client";

import { useMemo, useState } from "react";
import { AppShell } from "../components/dashboard/AppShell";
import { clients } from "../lib/mockData";

type CreativeVariation = { headline: string; description: string };
type CreativeBriefing = {
  palette: string[];
  scene: string;
  format: string;
  overlay_text: string;
  cta_visual: string;
};

const objectives = [
  { value: "conversa-wa", label: "Conversa WA" },
  { value: "lead", label: "Lead" },
  { value: "promo", label: "Promo" },
  { value: "visita", label: "Visita" },
];

const palettesByClient: Record<string, string[]> = {
  "Face e Corpo": ["#F5F0EB", "#C9A84C", "#FFFFFF", "#1A6B4A", "#1C1C1C"],
  "Dra. Gabriela Brito": ["#FFFFFF", "#C9A84C", "#1B4332"],
  "Edson Da Hora": ["#0A1628", "#F97316", "#FFFFFF"],
  "Marquinhos Estilos": ["#0A0A0A", "#D4AF37", "#FFFFFF"],
  Ejetec: ["#1E3A5F", "#64748B", "#FFFFFF"],
  "Tritão Náutica": ["#0077B6", "#FFFFFF", "#F4A261"],
  "Rei da Parmegiana": ["#C0392B", "#F1C40F", "#FFFFFF"],
  "Beatriz Lima Nutri": ["#2D6A4F", "#FFFFFF", "#F5E6D3"],
};

function buildBriefing(clientName: string, context: string): CreativeBriefing {
  const palette = palettesByClient[clientName] ?? palettesByClient["Face e Corpo"];
  const contextLower = context.toLowerCase();

  const sceneByClient: Record<string, string> = {
    "Face e Corpo": "Foto feminina elegante em close ou corpo, iluminação suave e natural, fundo neutro off-white, pele lisa e tratada, expressão serena. Título grande em dourado sobreposto. Logo Face e Corpo discreto no canto inferior.",
    "Dra. Gabriela Brito": "Ambiente sofisticado e acolhedor, profissional feminina, estética limpa e premium, iluminação quente e elegante",
    "Edson Da Hora": "Cena dinâmica com fundo escuro, postura firme e expressiva, composição moderna, foco na autoridade e confiança",
    "Marquinhos Estilos": "Modelo masculino com estilo urbano, composição elegante e ousada, fundo escuro com destaque para peças e textura",
    Ejetec: "Cena industrial, profissionalismo e técnica, elementos de soldagem com ambiente seguro e bem iluminado",
    "Tritão Náutica": "Cena marítima com água, céu azul e embarcação, sensação de aventura e conforto",
    "Rei da Parmegiana": "Tema gastronômico acolhedor, prato delicioso em ambiente quente, luz natural e sensação de sabor",
    "Beatriz Lima Nutri": "Ambiente saudável e acolhedor, alimentos naturais, estética leve e inspiradora",
  };

  const format = /reels|video|short/i.test(contextLower)
    ? "Reels 1080x1920px"
    : /stories|story/i.test(contextLower)
      ? "Stories 1080x1920px"
      : "Feed quadrado 1080x1080px";

  const overlayText = /botox/i.test(contextLower)
    ? "Botox • 3 áreas • R$597"
    : /nutri|saúde|nutrição/i.test(contextLower)
      ? "Plano personalizado • Agende agora"
      : /restaurante|delivery|pizza|hamburguer/i.test(contextLower)
        ? "Peça agora • Entrega rápida"
        : /nav|náutica|embarca/i.test(contextLower)
          ? "Reserve seu passeio"
          : /soldagem|industrial/i.test(contextLower)
            ? "Solicite seu orçamento"
            : "Oferta especial • Agende agora";

  return {
    palette,
    scene: sceneByClient[clientName] ?? "Cena elegante e visualmente limpa, com foco na proposta do produto e no público-alvo",
    format,
    overlay_text: overlayText,
    cta_visual: "Agende pelo WhatsApp",
  };
}

function buildCanvaUrl(briefing: CreativeBriefing, client: string, context: string) {
  const params = new URLSearchParams({
    client,
    context,
    palette: briefing.palette.join(","),
    scene: briefing.scene,
    format: briefing.format,
    overlayText: briefing.overlay_text,
    ctaVisual: briefing.cta_visual,
  });

  return `https://www.canva.com/create?${params.toString()}`;
}

export default function CriativosPage() {
  const [client, setClient] = useState(clients[0].name);
  const [objective, setObjective] = useState(objectives[0].value);
  const [context, setContext] = useState("Clínica estética premium com foco em avaliação gratuita.");
  const [variations, setVariations] = useState<CreativeVariation[]>([]);
  const [briefing, setBriefing] = useState<CreativeBriefing | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [briefingCopied, setBriefingCopied] = useState(false);

  const previewBriefing = useMemo(() => buildBriefing(client, context), [client, context]);
  const activeBriefing = briefing ?? previewBriefing;
  const canvaUrl = useMemo(() => buildCanvaUrl(activeBriefing, client, context), [activeBriefing, client, context]);

  const handleGenerate = async () => {
    setLoading(true);
    setCopiedIndex(null);
    setBriefingCopied(false);
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
        setBriefing(data.briefing ?? buildBriefing(client, context));
      } else {
        throw new Error("Invalid response");
      }
    } catch {
      setVariations([
        { headline: "Avaliação gratuita agora", description: "Receba uma análise personalizada para sua necessidade." },
        { headline: "Transforme sua rotina", description: "Descubra o plano ideal com especialistas." },
        { headline: "Oferta por tempo limitado", description: "Aproveite a condição especial de entrada." },
      ]);
      setBriefing(buildBriefing(client, context));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (variation: CreativeVariation, index: number) => {
    try {
      await navigator.clipboard.writeText(`${variation.headline}\n${variation.description}`);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1400);
    } catch {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1400);
    }
  };

  const handleCopyBriefing = async () => {
    const text = [
      `Cliente: ${client}`,
      `Paleta: ${activeBriefing.palette.join(", ")}`,
      `Cena: ${activeBriefing.scene}`,
      `Formato: ${activeBriefing.format}`,
      `Texto sobreposto: ${activeBriefing.overlay_text}`,
      `CTA visual: ${activeBriefing.cta_visual}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setBriefingCopied(true);
      setTimeout(() => setBriefingCopied(false), 1400);
    } catch {
      setBriefingCopied(true);
      setTimeout(() => setBriefingCopied(false), 1400);
    }
  };

  return (
    <AppShell title="Criativos" subtitle="Geração de variações com IA" activeLabel="Criativos">
      <div className="space-y-6">
        <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6">
          <h2 className="text-2xl font-semibold text-white">Gerador de anúncios com IA</h2>
          <p className="mt-2 text-sm text-zinc-400">Escolha o cliente, o objetivo e gere 3 variações prontas para teste, além de um briefing de arte completo para Canva.</p>
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

          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">Briefing de Arte</h3>
                  <p className="mt-1 text-sm text-zinc-400">Paleta, cena, formato e texto sobreposto para o Canva.</p>
                </div>
                <div className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-200">
                  {client}
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap gap-2">
                  {activeBriefing.palette.map((color) => (
                    <span key={color} className="h-8 w-8 rounded-full border border-white/20" style={{ backgroundColor: color }} />
                  ))}
                </div>
                <div className="mt-4 space-y-2 text-sm text-zinc-300">
                  <div>
                    <span className="text-zinc-500">Cena sugerida:</span> {activeBriefing.scene}
                  </div>
                  <div>
                    <span className="text-zinc-500">Formato:</span> {activeBriefing.format}
                  </div>
                  <div>
                    <span className="text-zinc-500">Texto sobreposto:</span> {activeBriefing.overlay_text}
                  </div>
                  <div>
                    <span className="text-zinc-500">CTA visual:</span> {activeBriefing.cta_visual}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button onClick={handleCopyBriefing} className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-sm font-semibold text-violet-200">
                  {briefingCopied ? "Copiado" : "Copiar briefing"}
                </button>
                <a href={canvaUrl} target="_blank" rel="noreferrer" className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-sm font-semibold text-cyan-200">
                  Abrir no Canva
                </a>
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
      </div>
    </AppShell>
  );
}
