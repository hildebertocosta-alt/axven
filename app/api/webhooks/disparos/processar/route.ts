import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { validateWebhookSecret } from "@/app/lib/webhookAuth";

// Chamado pelo n8n a cada 1 minuto. Pra cada disparo em andamento cujo horário
// de próximo envio já chegou, manda UMA mensagem (a próxima da fila) e agenda
// o próximo envio desse mesmo disparo pra daqui 1 a 3 minutos (delay aleatório,
// por precaução pra não levar o número do cliente a ser bloqueado no WhatsApp).
export async function POST(req: NextRequest) {
  const authError = validateWebhookSecret(req);
  if (authError) return authError;

  const agora = new Date();

  const { data: disparosDevidos, error: disparosError } = await supabaseAdmin
    .from("disparos")
    .select("id, cliente_id, mensagem, cards")
    .eq("status", "em_andamento")
    .or(`proximo_envio_em.is.null,proximo_envio_em.lte.${agora.toISOString()}`);

  if (disparosError) {
    return NextResponse.json({ error: disparosError.message }, { status: 500 });
  }

  const resultado: Array<Record<string, unknown>> = [];

  for (const disparo of disparosDevidos ?? []) {
    const { data: proximoItem } = await supabaseAdmin
      .from("disparos_itens")
      .select("id, lead_id")
      .eq("disparo_id", disparo.id)
      .eq("status", "pendente")
      .order("criado_em", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!proximoItem) {
      await supabaseAdmin
        .from("disparos")
        .update({ status: "concluido", concluido_em: new Date().toISOString() })
        .eq("id", disparo.id);
      resultado.push({ disparo_id: disparo.id, acao: "concluido_sem_pendentes" });
      continue;
    }

    const { data: lead } = await supabaseAdmin
      .from("leads")
      .select("id, nome, telefone")
      .eq("id", proximoItem.lead_id)
      .single();

    const { data: cliente } = await supabaseAdmin
      .from("clientes")
      .select("uazapi_token")
      .eq("id", disparo.cliente_id)
      .single();

    const proximoDelaySegundos = 60 + Math.floor(Math.random() * 121); // 60 a 180s
    const proximoEnvioEm = new Date(Date.now() + proximoDelaySegundos * 1000).toISOString();

    if (!lead?.telefone || !cliente?.uazapi_token) {
      await supabaseAdmin
        .from("disparos_itens")
        .update({ status: "falha", erro: "lead sem telefone ou WhatsApp do cliente não configurado" })
        .eq("id", proximoItem.id);

      const { data: disparoAtual } = await supabaseAdmin
        .from("disparos")
        .select("falhas")
        .eq("id", disparo.id)
        .single();

      await supabaseAdmin
        .from("disparos")
        .update({ falhas: (disparoAtual?.falhas ?? 0) + 1, proximo_envio_em: proximoEnvioEm })
        .eq("id", disparo.id);

      resultado.push({ disparo_id: disparo.id, item_id: proximoItem.id, acao: "falha", motivo: "dados incompletos" });
      continue;
    }

    const primeiroNome = lead.nome?.split(" ")[0] || "";
    const substituirNome = (texto: string) => texto.replaceAll("{{nome}}", primeiroNome);
    const mensagemFinal = substituirNome(disparo.mensagem);

    type CardDisparo = { texto: string; imagem_url: string; botao_texto: string };
    const cards = disparo.cards as CardDisparo[] | null;
    const temCards = Array.isArray(cards) && cards.length > 0;

    const endpoint = temCards ? "https://axven.uazapi.com/send/carousel" : "https://axven.uazapi.com/send/text";
    const payload = temCards
      ? {
          number: lead.telefone,
          text: mensagemFinal,
          carousel: cards!.map((card) => ({
            text: substituirNome(card.texto),
            image: card.imagem_url,
            buttons: [{ id: card.botao_texto, text: card.botao_texto, type: "REPLY" }],
          })),
        }
      : { number: lead.telefone, text: mensagemFinal };

    const envioResponse = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: cliente.uazapi_token },
      body: JSON.stringify(payload),
    });

    if (!envioResponse.ok) {
      const detalhe = await envioResponse.text().catch(() => "");
      await supabaseAdmin
        .from("disparos_itens")
        .update({ status: "falha", erro: detalhe.slice(0, 500) })
        .eq("id", proximoItem.id);

      const { data: disparoAtual } = await supabaseAdmin
        .from("disparos")
        .select("falhas")
        .eq("id", disparo.id)
        .single();

      await supabaseAdmin
        .from("disparos")
        .update({ falhas: (disparoAtual?.falhas ?? 0) + 1, proximo_envio_em: proximoEnvioEm })
        .eq("id", disparo.id);

      resultado.push({ disparo_id: disparo.id, item_id: proximoItem.id, acao: "falha", motivo: detalhe });
      continue;
    }

    const resumoParaHistorico = temCards
      ? `${mensagemFinal}\n\n${cards!.map((card) => `🛒 ${substituirNome(card.texto)}`).join("\n")}`
      : mensagemFinal;

    await supabaseAdmin
      .from("disparos_itens")
      .update({ status: "enviado", enviado_em: new Date().toISOString() })
      .eq("id", proximoItem.id);

    await supabaseAdmin.from("leads_mensagens").insert({ lead_id: lead.id, remetente: "humano", mensagem: resumoParaHistorico });
    await supabaseAdmin.from("leads").update({ atualizado_em: new Date().toISOString() }).eq("id", lead.id);

    const { data: disparoAtual } = await supabaseAdmin
      .from("disparos")
      .select("enviados")
      .eq("id", disparo.id)
      .single();

    const { count: pendentesRestantes } = await supabaseAdmin
      .from("disparos_itens")
      .select("id", { count: "exact", head: true })
      .eq("disparo_id", disparo.id)
      .eq("status", "pendente");

    const ficouSemPendentes = (pendentesRestantes ?? 0) === 0;

    await supabaseAdmin
      .from("disparos")
      .update({
        enviados: (disparoAtual?.enviados ?? 0) + 1,
        proximo_envio_em: proximoEnvioEm,
        ...(ficouSemPendentes ? { status: "concluido", concluido_em: new Date().toISOString() } : {}),
      })
      .eq("id", disparo.id);

    resultado.push({ disparo_id: disparo.id, item_id: proximoItem.id, acao: "enviado", proximo_envio_em: proximoEnvioEm });
  }

  return NextResponse.json({ processados: resultado.length, detalhes: resultado });
}
