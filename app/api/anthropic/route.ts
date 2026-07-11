import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

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
          max_tokens: 220,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();
      const text = data?.content?.[0]?.text ?? "Prioridade operacional atualizada com IA.";
      return NextResponse.json({ text });
    }

    return NextResponse.json({
      text: "Prioridade operacional atualizada com IA. Compare os dois conjuntos de anúncios da Face e Corpo e priorize o criativo com melhor performance.",
    });
  } catch {
    return NextResponse.json({
      text: "Prioridade operacional atualizada com IA. Compare os dois conjuntos de anúncios da Face e Corpo e priorize o criativo com melhor performance.",
    });
  }
}
