"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-300 transition hover:bg-white/10 hover:text-white"
    >
      Sair
    </button>
  );
}
