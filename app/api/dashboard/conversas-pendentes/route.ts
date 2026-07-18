import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

type MensagemRow = { remetente: string; mensagem: string; criado_em: string };

function ultimaMensagemPorChave<T extends string>(mensagens: (MensagemRow & { chave: T })[]) {
  const mapa = new Map<T, MensagemRow>();
  for (const msg of mensagens) {
    if (!mapa.has(msg.chave)) mapa.set(msg.chave, msg);
  }
  return mapa;
}

// Junta, num só lugar, as conversas de WhatsApp (prospecção + financeiro) que
// estão esperando uma resposta de um humano: ou porque a IA foi pausada nesse
// lead/cliente, ou porque a última mensagem trocada veio do outro lado e ainda
// não foi respondida (sinal de que a IA está de folga ou não respondeu a tempo).
export async function GET() {
  const [{ data: leads }, { data: mensagensLeads }, { data: clientes }, { data: mensagensFinanceiro }] =
    await Promise.all([
      supabaseAdmin
        .from("leads_comerciais")
        .select("id, nome, telefone, estado_funil, pausado_ia, atualizado_em")
        .neq("estado_funil", "perdido"),
      supabaseAdmin
        .from("leads_comerciais_mensagens")
        .select("lead_id, remetente, mensagem, criado_em")
        .order("criado_em", { ascending: false })
        .limit(500),
      supabaseAdmin.from("clientes").select("id, nome, telefone"),
      supabaseAdmin
        .from("financeiro_mensagens")
        .select("cliente_id, remetente, mensagem, criado_em")
        .order("criado_em", { ascending: false })
        .limit(500),
    ]);

  const ultimaPorLead = ultimaMensagemPorChave(
    (mensagensLeads ?? []).map((m) => ({ ...m, chave: m.lead_id as string })),
  );
  const ultimaPorCliente = ultimaMensagemPorChave(
    (mensagensFinanceiro ?? []).map((m) => ({ ...m, chave: m.cliente_id as string })),
  );

  type Conversa = {
    origem: "prospeccao" | "financeiro";
    id: string;
    nome: string;
    telefone: string | null;
    motivo: "pausado" | "sem_resposta";
    ultima_mensagem: string | null;
    ultima_mensagem_em: string;
  };

  const conversasLeads: Conversa[] = [];
  for (const lead of leads ?? []) {
    const ultima = ultimaPorLead.get(lead.id);
    const pausado = lead.pausado_ia === true;
    const semResposta = !!ultima && ultima.remetente === "lead";
    if (!pausado && !semResposta) continue;
    conversasLeads.push({
      origem: "prospeccao",
      id: lead.id,
      nome: lead.nome,
      telefone: lead.telefone ?? null,
      motivo: pausado ? "pausado" : "sem_resposta",
      ultima_mensagem: ultima?.mensagem ?? null,
      ultima_mensagem_em: ultima?.criado_em ?? lead.atualizado_em,
    });
  }

  const conversasFinanceiro: Conversa[] = [];
  for (const cliente of clientes ?? []) {
    const ultima = ultimaPorCliente.get(cliente.id);
    if (!ultima || ultima.remetente !== "cliente") continue;
    conversasFinanceiro.push({
      origem: "financeiro",
      id: cliente.id,
      nome: cliente.nome,
      telefone: cliente.telefone ?? null,
      motivo: "sem_resposta",
      ultima_mensagem: ultima.mensagem,
      ultima_mensagem_em: ultima.criado_em,
    });
  }

  const conversas = [...conversasLeads, ...conversasFinanceiro].sort(
    (a, b) => new Date(b.ultima_mensagem_em).getTime() - new Date(a.ultima_mensagem_em).getTime(),
  );

  return NextResponse.json({ conversas: conversas.slice(0, 15), total: conversas.length });
}
