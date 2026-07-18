import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { validateWebhookSecret } from "@/app/lib/webhookAuth";

// Chamado pelo n8n logo depois de enviar o lembrete de WhatsApp, pra marcar
// o compromisso e não avisar de novo na próxima checagem.
export async function POST(req: NextRequest) {
  const authError = validateWebhookSecret(req);
  if (authError) return authError;

  const body = await req.json().catch(() => null);
  const id = body?.id as string | undefined;

  if (!id) {
    return NextResponse.json({ error: "id e obrigatorio" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("compromissos")
    .update({ lembrete_enviado_em: new Date().toISOString() })
    .eq("id", id)
    .select("id, lembrete_enviado_em")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ compromisso: data });
}
