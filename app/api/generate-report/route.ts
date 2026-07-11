import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const client = body?.client ?? "Cliente";
  const period = body?.period ?? "Essa semana";

  return NextResponse.json({
    client,
    period,
    generatedAt: new Date().toISOString(),
    status: "gerado",
  });
}
