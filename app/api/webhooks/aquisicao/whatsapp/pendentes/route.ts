import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { validateWebhookSecret } from "@/app/lib/webhookAuth";

const TZ = "America/Sao_Paulo";

function formatDateTime(iso: string) {
  const date = new Date(iso);
  const dia = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, weekday: "long", day: "2-digit", month: "2-digit" }).format(date);
  const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(date);
  return { dia, hora };
}

export async function GET(req: NextRequest) {
  const unauthorized = validateWebhookSecret(req);
  if (unauthorized) return unauthorized;

  const { data: claimed, error: claimError } = await supabaseAdmin.rpc("claim_aquisicao_axven_whatsapp_outbox");
  if (claimError) {
    console.error("[aquisicao-whatsapp] claim error", claimError.message);
    return NextResponse.json({ error: "falha_ao_buscar_pendente" }, { status: 500 });
  }

  const item = claimed?.[0];
  if (!item) return NextResponse.json({ item: null }, { headers: { "Cache-Control": "no-store" } });

  const { data: lead, error: leadError } = await supabaseAdmin
    .from("aquisicao_axven_leads")
    .select("id, nome, clinica, whatsapp")
    .eq("id", item.lead_id)
    .single();

  const { data: booking, error: bookingError } = await supabaseAdmin
    .from("aquisicao_axven_agendamentos")
    .select("id, inicio, fim, timezone, status")
    .eq("id", item.agendamento_id)
    .single();

  if (leadError || bookingError || !lead?.whatsapp || !booking || booking.status !== "agendado") {
    await supabaseAdmin.from("aquisicao_axven_whatsapp_outbox").update({ status: "falhou", ultimo_erro: "dados_do_lead_ou_agendamento_invalidos", disponivel_em: new Date(Date.now() + 5 * 60 * 1000).toISOString(), atualizado_em: new Date().toISOString() }).eq("id", item.id);
    return NextResponse.json({ error: "dados_invalidos" }, { status: 409 });
  }

  const { dia, hora } = formatDateTime(booking.inicio);
  const primeiroNome = (lead.nome || "").trim().split(/\s+/)[0] || "Olá";
  const mensagem = `Olá, ${primeiroNome}! 👋 Sua Análise de Crescimento Axven está confirmada para ${dia}, às ${hora} (horário de Brasília). A conversa terá duração aproximada de 45 minutos. Mais perto do horário, enviaremos um lembrete por aqui.`;

  return NextResponse.json({
    item: {
      id: item.id,
      tipo: item.tipo,
      telefone: lead.whatsapp,
      nome: lead.nome,
      clinica: lead.clinica,
      mensagem,
      agendamento: { id: booking.id, inicio: booking.inicio, fim: booking.fim, timezone: booking.timezone },
    },
  }, { headers: { "Cache-Control": "no-store" } });
}
