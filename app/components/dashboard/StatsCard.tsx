type StatsCardProps = {
  title: string;
  value: string;
  caption: string;
  tone?: "cyan" | "violet" | "emerald";
};

export function StatsCard({
  title,
  value,
  caption,
  tone = "cyan",
}: StatsCardProps) {
  const toneClass = {
    cyan: "from-cyan-400/20 to-cyan-500/5 text-cyan-300",
    violet: "from-violet-400/20 to-violet-500/5 text-violet-300",
    emerald: "from-emerald-400/20 to-emerald-500/5 text-emerald-300",
  }[tone];

  return (
    <div className={`rounded-3xl border border-white/10 bg-gradient-to-br ${toneClass} p-5`}>
      <p className="text-sm text-zinc-400">{title}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-zinc-400">{caption}</p>
    </div>
  );
}
