import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, telefone = null } = body;

  if (!id) return NextResponse.json({ error: "id obrigatorio" }, { status: 400 });

  const telefoneNormalizado = typeof telefone === "string" && telefone.trim() ? telefone.replace(/\D/g, "") : null;

  const { data, error } = await supabaseAdmin
    .from("clientes")
    .update({ telefone: telefoneNormalizado })
    .eq("id", id)
    .select("id, nome, telefone")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cliente: data });
}
