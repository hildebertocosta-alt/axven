import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { validateWebhookSecret } from "@/app/lib/webhookAuth";

// Recebe um novo lead vindo do Zapier (gatilho "New Lead" do Facebook Lead Ads)
// e insere direto no CRM do cliente correspondente, na coluna "Lead".
export async function POST(req: NextRequest) {
  const authError = validateWebhookSecret(req);
  if (authError) return authError;

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "corpo invalido" }, { status: 400 });
  }

  const { cliente_slug, nome, telefone, campanha, conjunto, anuncio, plataforma, origem } = body as {
    cliente_slug?: string;
    nome?: string;
    telefone?: string;
    campanha?: string;
    conjunto?: string;
    anuncio?: string;
    plataforma?: string;
    origem?: string;
  };

  if (!cliente_slug || !nome) {
    return NextResponse.json({ error: "cliente_slug e nome sao obrigatorios" }, { status: 400 });
  }

  const { data: cliente, error: clienteError } = await supabaseAdmin
    .from("clientes")
    .select("id")
    .eq("slug", cliente_slug)
    .single();

  if (clienteError || !cliente) {
    return NextResponse.json({ error: "cliente nao encontrado" }, { status: 404 });
  }

  const { data: lead, error: leadError } = await supabaseAdmin
    .from("leads")
    .insert({
      cliente_id: cliente.id,
      nome,
      telefone: telefone ?? null,
      etapa: "lead",
      origem: origem ?? "Meta Ads",
      campanha: campanha ?? null,
      conjunto: conjunto ?? null,
      anuncio: anuncio ?? null,
      plataforma: plataforma ?? null,
    })
    .select("id, nome, cliente_id, etapa")
    .single();

  if (leadError) {
    return NextResponse.json({ error: leadError.message }, { status: 500 });
  }

  return NextResponse.json({ lead });
}
