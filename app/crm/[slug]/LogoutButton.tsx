"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/crm/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/10"
    >
      Sair
    </button>
  );
}
