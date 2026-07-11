import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const id = body?.id;
  const meta_account_id = typeof body?.meta_account_id === "string" ? body.meta_account_id : null;

  if (!id) return NextResponse.json({ error: "id obrigatorio" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("clientes")
    .update({ meta_account_id })
    .eq("id", id)
    .select("id, nome, meta_account_id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cliente: data });
}
