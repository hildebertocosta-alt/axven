import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { id } = body;

  if (!id) return NextResponse.json({ error: "id obrigatorio" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("financeiro")
    .update({ status: "pago" })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ financeiro: data });
}
