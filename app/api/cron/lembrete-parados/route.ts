import { NextRequest, NextResponse } from "next/server";
import { isValidCronAuthorization } from "@/app/lib/cronAuth";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { dataLembrete, limiteParado, linkParados, textoLembrete } from "@/app/lib/lembreteParados";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Usuario = { user_id: string; nome: string | null; whatsapp: string; cliente_id: string };

// Mesma regra do portal: fora de Venda/Perdido, sem mudança de etapa há mais de 3 dias, sem leads de teste.
async function contarParados(clienteId: string, agora: Date) {
  const { data: etapas } = await supabaseAdmin.from("cliente_etapas").select("chave, tipo").eq("cliente_id", clienteId);
  const encerradas = (etapas ?? []).filter((e) => e.tipo === "venda" || e.tipo === "perdido").map((e) => e.chave);
  let consulta = supabaseAdmin
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("cliente_id", clienteId)
    .lt("etapa_alterada_em", limiteParado(agora))
    .or("plataforma.is.null,plataforma.neq.teste");
  if (encerradas.length > 0) consulta = consulta.not("etapa", "in", `(${encerradas.join(",")})`);
  const { count, error } = await consulta;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function enviarUazapi(numero: string, texto: string) {
  const token = process.env.UAZAPI_AXVEN_TOKEN;
  if (!token) return { ok: false as const, erro: "UAZAPI_AXVEN_TOKEN ausente" };
  const resposta = await fetch("https://axven.uazapi.com/send/text", {
    method: "POST",
    headers: { "Content-Type": "application/json", token },
    body: JSON.stringify({ number: numero, text: texto }),
    signal: AbortSignal.timeout(15000),
  });
  const corpo = await resposta.json().catch(() => null);
  const id = typeof corpo?.messageid === "string" ? corpo.messageid.trim() : "";
  return resposta.ok && id ? { ok: true as const, id } : { ok: false as const, erro: `uazapi status ${resposta.status}` };
}

// Cron diário (08h30 de Brasília). ?simular=1 só conta; ?para=<número> manda uma prova para outro número sem travar o dia.
export async function GET(req: NextRequest) {
  const headers = { "Cache-Control": "no-store" };
  if (!isValidCronAuthorization(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers });
  }

  const agora = new Date();
  const hoje = dataLembrete(agora);
  const simular = req.nextUrl.searchParams.get("simular") === "1";
  const paraTeste = (req.nextUrl.searchParams.get("para") ?? "").replace(/\D/g, "");

  const { data: usuarios, error } = await supabaseAdmin
    .from("crm_usuarios")
    .select("user_id, nome, whatsapp, cliente_id")
    .eq("recebe_lembrete", true)
    .not("whatsapp", "is", null);
  if (error) return NextResponse.json({ error: "falha_ao_ler_usuarios" }, { status: 500, headers });

  const resultado: { usuario: string; cliente: string; parados: number; status: string }[] = [];

  for (const usuario of (usuarios ?? []) as Usuario[]) {
    const quem = usuario.nome ?? usuario.user_id;
    try {
      const { data: cliente } = await supabaseAdmin
        .from("clientes")
        .select("id, nome, slug, status_pagamento")
        .eq("id", usuario.cliente_id)
        .maybeSingle();
      if (!cliente || cliente.status_pagamento === "cancelado" || !cliente.slug) continue;

      const parados = await contarParados(cliente.id, agora);
      if (parados === 0) {
        resultado.push({ usuario: quem, cliente: cliente.nome, parados, status: "sem_parados" });
        continue;
      }

      const mensagem = textoLembrete({ nomeAtendente: usuario.nome, nomeCliente: cliente.nome, parados, link: linkParados(cliente.slug) });
      if (simular) {
        resultado.push({ usuario: quem, cliente: cliente.nome, parados, status: "simulado" });
        continue;
      }

      if (paraTeste) {
        const envio = await enviarUazapi(paraTeste, mensagem);
        resultado.push({ usuario: quem, cliente: cliente.nome, parados, status: envio.ok ? "teste_enviado" : `teste_falhou: ${envio.erro}` });
        continue;
      }

      // A unicidade (usuario_id, tipo, data_ref) garante um lembrete por dia, mesmo se o cron rodar de novo.
      const { data: notificacao, error: erroInsert } = await supabaseAdmin
        .from("notificacoes_whatsapp")
        .insert({ usuario_id: usuario.user_id, cliente_id: cliente.id, tipo: "lembrete_parados", data_ref: hoje, telefone: usuario.whatsapp, mensagem })
        .select("id")
        .single();
      if (erroInsert || !notificacao) {
        resultado.push({ usuario: quem, cliente: cliente.nome, parados, status: erroInsert?.code === "23505" ? "ja_enviado_hoje" : "falha_ao_registrar" });
        continue;
      }

      const envio = await enviarUazapi(usuario.whatsapp, mensagem);
      await supabaseAdmin
        .from("notificacoes_whatsapp")
        .update(envio.ok ? { status: "enviado", provider_message_id: envio.id, enviado_em: new Date().toISOString() } : { status: "falhou", erro: envio.erro })
        .eq("id", notificacao.id);
      resultado.push({ usuario: quem, cliente: cliente.nome, parados, status: envio.ok ? "enviado" : "falhou" });
    } catch (erro) {
      console.error("[lembrete-parados]", usuario.user_id, erro instanceof Error ? erro.message : erro);
      resultado.push({ usuario: quem, cliente: usuario.cliente_id, parados: -1, status: "erro" });
    }
  }

  return NextResponse.json({ data: hoje, resultado }, { headers });
}
