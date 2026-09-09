import type { ReactNode } from "react";
import { Sidebar, type NavItem } from "./Sidebar";
import { Topbar } from "./Topbar";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: "⌂" },
  { label: "Clientes", href: "/clientes", icon: "◫" },
  { label: "Financeiro", href: "/financeiro", icon: "$" },
  { label: "Criativos", href: "/criativos", icon: "✦" },
  { label: "Relatórios", href: "/relatorios", icon: "▥" },
  { label: "Agenda", href: "/dashboard/agenda", icon: "□" },
  { label: "CRM", href: "/pipeline", icon: "◇" },
  { label: "Integrações", href: "/integracoes", icon: "⌁" },
];

type AppShellProps = {
  title: string;
  subtitle: string;
  activeLabel: string;
  children: ReactNode;
  actions?: ReactNode;
  sidebarStatus?: { lastUpdated: string | null };
  variant?: "internal" | "portal";
  sidebarItems?: NavItem[];
};

export function AppShell({ title, subtitle, activeLabel, children, actions, sidebarStatus, variant = "internal", sidebarItems }: AppShellProps) {
  const items = sidebarItems ?? (variant === "portal" ? [] : navItems);
  return (
    <div className="min-h-screen bg-[#08090d] text-zinc-100 selection:bg-[#ff5a3c]/30">
      <Sidebar items={items} activeLabel={activeLabel} status={sidebarStatus} variant={variant} />
      <main className="relative lg:ml-[272px]">
        <div className="pointer-events-none fixed inset-0 -z-0 bg-[radial-gradient(circle_at_72%_-10%,rgba(255,90,60,0.07),transparent_28%),radial-gradient(circle_at_15%_85%,rgba(255,61,87,0.025),transparent_24%)] lg:left-[272px]" />
        <div className="relative z-10">
          <Topbar title={title} subtitle={subtitle} actions={actions} />
          <section className="mx-auto w-full max-w-[1680px] px-5 py-6 lg:px-7 xl:px-9 xl:py-8">{children}</section>
        </div>
      </main>
    </div>
  );
}
