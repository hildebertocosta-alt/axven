import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

// Cancela um disparo em andamento: os itens ainda pendentes na fila deixam de
// ser enviados. Itens já enviados continuam registrados normalmente.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: disparoId } = await params;

  const authHeader = req.headers.get("authorization") ?? "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "");
  if (!accessToken) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(accessToken);
  if (userError || !userData?.user) {
    return NextResponse.json({ error: "sessão inválida" }, { status: 401 });
  }

  const { data: crmUsuario } = await supabaseAdmin
    .from("crm_usuarios")
    .select("cliente_id")
    .eq("user_id", userData.user.id)
    .single();

  if (!crmUsuario) {
    return NextResponse.json({ error: "usuário sem cliente vinculado" }, { status: 403 });
  }

  const { data: disparo } = await supabaseAdmin
    .from("disparos")
    .select("id, cliente_id, status")
    .eq("id", disparoId)
    .single();

  if (!disparo || disparo.cliente_id !== crmUsuario.cliente_id) {
    return NextResponse.json({ error: "disparo não encontrado" }, { status: 404 });
  }

  if (disparo.status !== "em_andamento") {
    return NextResponse.json({ error: "esse disparo já não está em andamento" }, { status: 400 });
  }

  await supabaseAdmin
    .from("disparos_itens")
    .update({ status: "cancelado" })
    .eq("disparo_id", disparoId)
    .eq("status", "pendente");

  const { data: atualizado, error } = await supabaseAdmin
    .from("disparos")
    .update({ status: "cancelado", concluido_em: new Date().toISOString() })
    .eq("id", disparoId)
    .select("id, status, enviados, falhas, total_leads")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ disparo: atualizado });
}
