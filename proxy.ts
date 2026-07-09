import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet, headers) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    }
  );

  if (!pathname.startsWith("/crm/") || pathname === "/crm/login") {
    return response;
  }

  const slug = pathname.split("/")[2];
  if (!slug) {
    return response;
  }

  const deny = () => NextResponse.redirect(new URL("/crm/login?erro=acesso_negado", request.url));

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/crm/login", request.url));
  }

  const { data: vinculo } = await supabase
    .from("crm_usuarios")
    .select("cliente_id")
    .eq("user_id", user.id)
    .single();

  if (!vinculo) {
    return deny();
  }

  const { data: cliente } = await supabase.from("clientes").select("id").eq("slug", slug).single();

  if (!cliente || cliente.id !== vinculo.cliente_id) {
    return deny();
  }

  return response;
}

export const config = {
  matcher: ["/crm/:path*"],
};
