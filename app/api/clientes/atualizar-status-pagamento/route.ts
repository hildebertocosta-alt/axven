import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

const STATUS_PAGAMENTO = ["pago", "em_dia", "atrasado", "cancelado"];

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, status_pagamento } = body;

  if (!id) return NextResponse.json({ error: "id obrigatorio" }, { status: 400 });
  if (!STATUS_PAGAMENTO.includes(status_pagamento)) {
    return NextResponse.json({ error: "status_pagamento invalido" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("clientes")
    .update({ status_pagamento })
    .eq("id", id)
    .select("id, nome, status_pagamento")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cliente: data });
}
