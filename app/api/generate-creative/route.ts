import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { client, objective, context } = await request.json();

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
          return NextResponse.json(parsed);
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
    });
  }
}
