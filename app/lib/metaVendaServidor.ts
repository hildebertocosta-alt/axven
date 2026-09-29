import "server-only";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { eventIdVenda, montarEventoVenda } from "@/app/lib/metaVenda";

const GRAPH = "https://graph.facebook.com/v21.0";

// capi_eventos tem UNIQUE (event_id, status): cada situação fica registrada uma vez por lead.
async function registrar(clienteId: string, leadId: string, status: string, payload: Record<string, unknown>, erro: string | null) {
  await supabaseAdmin.from("capi_eventos").upsert(
    {
      cliente_id: clienteId,
      lead_id: leadId,
      event_name: "Purchase",
      event_id: eventIdVenda(leadId),
      status,
      payload,
      erro: erro ? erro.slice(0, 300) : null,
      enviado_em: status === "enviado" ? new Date().toISOString() : null,
    },
    { onConflict: "event_id,status", ignoreDuplicates: true },
  );
}

// Chamado depois que o banco confirmou a venda. Nunca lança erro: a venda já está registrada,
// e o Meta fora do ar não pode desfazer isso. Toda tentativa fica em capi_eventos.
export async function enviarVendaAoMeta(leadId: string): Promise<void> {
  try {
    const { data: lead } = await supabaseAdmin
      .from("leads")
      .select("id, cliente_id, etapa, plataforma, valor_conversao, moeda, data_conversao, leadgen_id, ctwaclid, page_id, telefone, email")
      .eq("id", leadId)
      .maybeSingle();
    if (!lead || lead.etapa !== "fechado" || lead.plataforma === "teste") return;

    const { data: cliente } = await supabaseAdmin.from("clientes").select("id, pixel_id, capi_origem").eq("id", lead.cliente_id).maybeSingle();
    if (!cliente || cliente.capi_origem !== "axven" || !cliente.pixel_id) return;

    const { data: jaEnviado } = await supabaseAdmin
      .from("capi_eventos")
      .select("id")
      .eq("event_id", eventIdVenda(lead.id))
      .eq("status", "enviado")
      .maybeSingle();
    if (jaEnviado) return;

    const { data: segredo } = await supabaseAdmin.from("cliente_segredos").select("meta_capi_token").eq("cliente_id", cliente.id).maybeSingle();
    if (!segredo?.meta_capi_token) {
      await registrar(cliente.id, lead.id, "sem_token", {}, "Cliente sem token de Conversões cadastrado.");
      return;
    }

    const montado = montarEventoVenda(
      {
        id: lead.id,
        valor: lead.valor_conversao === null ? null : Number(lead.valor_conversao),
        moeda: lead.moeda,
        dataConversao: lead.data_conversao,
        leadgenId: lead.leadgen_id,
        ctwaclid: lead.ctwaclid,
        pageId: lead.page_id,
        telefone: lead.telefone,
        email: lead.email,
      },
      new Date(),
    );
    if (!montado.ok) {
      await registrar(cliente.id, lead.id, "ignorado", {}, montado.motivo);
      return;
    }

    const corpo: Record<string, unknown> = { data: [montado.evento], access_token: segredo.meta_capi_token };
    if (process.env.META_CAPI_TEST_EVENT_CODE) corpo.test_event_code = process.env.META_CAPI_TEST_EVENT_CODE;

    const resposta = await fetch(`${GRAPH}/${cliente.pixel_id}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(8000),
    });
    const retorno = await resposta.json().catch(() => null);
    if (resposta.ok) {
      await registrar(cliente.id, lead.id, "enviado", { evento: montado.evento, retorno }, null);
    } else {
      await registrar(cliente.id, lead.id, "falhou", { evento: montado.evento }, retorno?.error?.message ?? `status ${resposta.status}`);
    }
  } catch (erro) {
    console.error("[meta-venda] falha ao enviar venda", leadId, erro instanceof Error ? erro.message : erro);
  }
}
