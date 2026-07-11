import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  const telefone = typeof body?.telefone === "string" ? body.telefone.replace(/\D/g, "") : "";
  if (!telefone) return NextResponse.json({ error: "telefone obrigatorio" }, { status: 400 });

  const nome = typeof body?.nome === "string" && body.nome.trim() ? body.nome.trim() : null;
  const nicho = typeof body?.nicho === "string" && body.nicho.trim() ? body.nicho.trim() : null;
  const como_chegou = typeof body?.como_chegou === "string" && body.como_chegou.trim() ? body.como_chegou.trim() : "indicacao";

  // Lead cadastrado manualmente (ex.: indicação fora do WhatsApp) não passou pelo
  // fluxo de abordagem automática, então o estado do funil de automação é marcado
  // como concluído — se ele mandar mensagem no WhatsApp, o n8n não tenta qualificá-lo
  // de novo como se fosse resposta de um disparo frio.
  const { data, error } = await supabaseAdmin
    .from("leads_comerciais")
    .insert({
      telefone,
      nome,
      nicho,
      como_chegou,
      etapa: "novo_lead",
      estado_funil: "concluido",
    })
    .select("id, nome, telefone, nicho, como_chegou, etapa, atualizado_em")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lead: data });
}
