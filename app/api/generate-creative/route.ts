import { NextResponse } from "next/server";

type CreativeBriefing = {
  palette: string[];
  scene: string;
  format: string;
  overlay_text: string;
  cta_visual: string;
};

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

function buildBriefing(client: string, context: string): CreativeBriefing {
  const palette = palettesByClient[client] ?? palettesByClient["Face e Corpo"];
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
    scene: sceneByClient[client] ?? "Cena elegante e visualmente limpa, com foco na proposta do produto e no público-alvo",
    format,
    overlay_text: overlayText,
    cta_visual: "Agende pelo WhatsApp",
  };
}

export async function POST(request: Request) {
  try {
    const { client, objective, context } = await request.json();
    const briefing = buildBriefing(client, context);

    if (process.env.ANTHROPIC_API_KEY) {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 300,
          messages: [
            {
              role: "user",
              content: `Gere 3 variações de anúncio para o cliente ${client}. Objetivo: ${objective}. Contexto do produto: ${context}. Responda apenas em JSON puro, no formato {"variations":[{"headline":"...","description":"..."},{"headline":"...","description":"..."},{"headline":"...","description":"..."}]}`,
            },
          ],
        }),
      });

      const data = await response.json();
      const text = data?.content?.[0]?.text ?? "";

      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed?.variations)) {
          return NextResponse.json({ variations: parsed.variations, briefing });
        }
      } catch {
        // fallback below
      }
    }

    return NextResponse.json({
      variations: [
        {
          headline: "Avaliação gratuita agora",
          description: "Ofereça uma experiência personalizada com um diagnóstico especializado.",
        },
        {
          headline: "Transforme sua rotina",
          description: "Descubra a solução ideal com um plano simples e direto.",
        },
        {
          headline: "Experimente já",
          description: "Comece hoje com uma oferta de entrada e veja os resultados.",
        },
      ],
      briefing,
    });
  } catch {
    return NextResponse.json({
      variations: [
        {
          headline: "Avaliação gratuita agora",
          description: "Ofereça uma experiência personalizada com um diagnóstico especializado.",
        },
        {
          headline: "Transforme sua rotina",
          description: "Descubra a solução ideal com um plano simples e direto.",
        },
        {
          headline: "Experimente já",
          description: "Comece hoje com uma oferta de entrada e veja os resultados.",
        },
      ],
      briefing: {
        palette: ["#F5E6E0", "#D4A5A5", "#8B4B62"],
        scene: "Cena elegante e visualmente limpa, com foco na proposta do produto e no público-alvo",
        format: "Feed quadrado 1080x1080px",
        overlay_text: "Oferta especial • Agende agora",
        cta_visual: "Agende pelo WhatsApp",
      },
    });
  }
}
