import Link from "next/link";
import { Space_Grotesk } from "next/font/google";
import RastroScript, { CHAVE_RASTRO_AXVEN_DIGITAL } from "@/app/components/RastroScript";
import MetodoScroll from "@/app/components/MetodoScroll";

// Página inicial da Axven (10/11/2026): Método Axven, Axven Rastro e WhatsApp comercial 99849 (IA do Rastro).
const sg = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

const WHATS = "https://wa.me/5581998495323?text=Vim%20do%20site.%20Quero%20o%20diagn%C3%B3stico.";
const LOGO = "/pasted-1788289300144-0.png";

const etapas = [
  { n: "01", nome: "Atrair", texto: "Campanhas que trazem quem tem perfil de compra, não só curioso.", onde: "Meta Ads · Google quando faz sentido" },
  { n: "02", nome: "Rastrear", texto: "Cada contato chega com a origem: de qual anúncio veio.", onde: "Axven Rastro" },
  { n: "03", nome: "Atender", texto: "Resposta rápida, roteiro, IA e follow-up. Nenhum contato esfria esquecido.", onde: "Axven Rastro" },
  { n: "04", nome: "Converter", texto: "A venda é registrada e volta para a Meta, que passa a procurar quem compra.", onde: "Axven Rastro + Meta", verde: true },
  { n: "05", nome: "Decidir", texto: "Relatório por faturamento e o gargalo do mês decidem o próximo passo.", onde: "Relatório Axven" },
];

const rastro = [
  ["Origem de cada contato", "Você sabe de qual anúncio veio cada conversa no WhatsApp."],
  ["Atendimento que não esfria", "Resposta rápida, IA e follow-up até a pessoa decidir."],
  ["A venda volta para a Meta", "O anúncio aprende com quem comprou, não com quem só clicou."],
  ["Relatório por faturamento", "Investimento, conversas, vendas e o gargalo do mês."],
];

const duvidas = [
  ["Vocês são agência de tráfego?", "Não só. O anúncio é a etapa 1. A gente cuida do atendimento, do rastreamento e mostra o resultado em venda."],
  ["Atende o meu ramo?", "Se você vende produto ou serviço e o cliente chega pelo WhatsApp, sim. O método é o mesmo; muda o roteiro."],
  ["Quanto custa?", "Depende do tamanho da operação. A gente vê isso na call, depois de entender o seu negócio."],
  ["Preciso trocar meu WhatsApp?", "Não. Seu número continua o mesmo."],
  ["Em quanto tempo vejo resultado?", "Nas primeiras semanas você já sabe de onde vem cada contato. Venda depende do seu atendimento, e é aí que a gente entra junto."],
  ["Como funciona a call?", "50 minutos com o Hildeberto, pelo Google Meet. Ele mostra onde a venda está escapando no seu caso."],
];

const certificados = [
  { img: "/site/cert-kommo.jpg", nome: "Parceiro oficial Kommo", info: "Certificação de parceria · CRM" },
  { img: "/site/cert-ads.jpg", nome: "Ads de Alta Performance", info: "Meta Ads · 35 h · 2026" },
  { img: "/site/cert-staage.jpg", nome: "Growth Marketing", info: "Workshop Pré-GMP · Staage · 2025" },
];

function Botao({ children, claro = false }: { children: React.ReactNode; claro?: boolean }) {
  return (
    <a
      href={WHATS}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center justify-center rounded-full px-7 py-4 text-base font-bold transition hover:-translate-y-0.5 ${claro ? "bg-[#0B0B0F] text-white" : "bg-[#F2551F] text-white hover:bg-[#ff6a37]"}`}
    >
      {children}
    </a>
  );
}

function Selo({ children, verde = false }: { children: React.ReactNode; verde?: boolean }) {
  return <p className={`text-xs font-bold uppercase tracking-[.28em] ${verde ? "text-[#81F002]" : "text-[#F2551F]"}`}>{children}</p>;
}

export default function InstitucionalPage() {
  return (
    <main className={`${sg.className} min-h-screen overflow-x-clip bg-[#0B0B0F] text-[#F5F5F7]`}>
      <RastroScript chave={CHAVE_RASTRO_AXVEN_DIGITAL} />

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0B0B0F]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 md:px-6">
          <Link href="/" aria-label="Axven Digital" className="flex items-center">
            <img src={LOGO} alt="Axven Digital" className="h-9 w-auto object-contain sm:h-10" />
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-[#9B9BA4] lg:flex">
            <a href="#metodo" className="transition hover:text-white">Método</a>
            <a href="#resultados" className="transition hover:text-white">Resultados</a>
            <a href="#duvidas" className="transition hover:text-white">Dúvidas</a>
            <a href="#sobre" className="transition hover:text-white">Sobre</a>
          </nav>
          <a href={WHATS} target="_blank" rel="noreferrer" className="rounded-full bg-[#F2551F] px-4 py-2.5 text-xs font-bold text-white sm:px-5 sm:text-sm">Diagnóstico gratuito ↗</a>
        </div>
      </header>

      {/* Abertura */}
      <section className="relative">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[560px] w-[560px] rounded-full bg-[#F2551F]/15 blur-[140px]" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-14 md:px-6 md:pt-20 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:pb-28">
          <div>
            <Selo>Método Axven</Selo>
            <h1 className="mt-6 text-5xl font-bold leading-[.95] tracking-[-.045em] sm:text-7xl xl:text-[92px]">
              Do anúncio <span className="text-[#F2551F]">até a venda.</span>
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-8 text-[#B4B4BC] md:text-xl">
              Anúncio, atendimento e WhatsApp num lugar só, e você sabe qual anúncio vendeu.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Botao>Quero o diagnóstico gratuito ↗</Botao>
              <a href="#metodo" className="inline-flex items-center rounded-full border border-white/15 px-7 py-4 font-semibold text-white/80 transition hover:border-white/40">Ver o método</a>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-sm lg:max-w-md">
            <div className="absolute -inset-4 rounded-[2.4rem] bg-gradient-to-br from-[#F2551F]/30 to-transparent blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10">
              <img src="/site/hildeberto-estudio.jpg" alt="Hildeberto Junior, fundador da Axven Digital" className="aspect-[4/5] w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0B0B0F] via-[#0B0B0F]/70 to-transparent px-6 pb-6 pt-24">
                <p className="text-lg font-bold">Hildeberto Junior</p>
                <p className="text-sm text-[#9B9BA4]">Fundador da Axven Digital</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* A dor */}
      <section className="border-y border-white/10 bg-[#111117]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 md:px-6 md:py-24 lg:grid-cols-2 lg:items-center">
          <h2 className="text-4xl font-bold leading-[1.05] tracking-[-.035em] md:text-5xl">
            Você anuncia, chega mensagem… e quantas <span className="text-[#F2551F]">viraram venda?</span>
          </h2>
          <div className="grid gap-4">
            <div className="rounded-3xl border border-white/10 bg-[#17171D] p-7">
              <p className="text-xs font-bold uppercase tracking-[.25em] text-[#63636C]">A maioria</p>
              <p className="mt-3 text-xl text-[#9B9BA4]">Entrega o clique e para no lead.</p>
            </div>
            <div className="rounded-3xl border-2 border-[#F2551F] bg-gradient-to-br from-[#F2551F]/15 to-[#F2551F]/[.03] p-7">
              <p className="text-xs font-bold uppercase tracking-[.25em] text-[#F2551F]">A Axven</p>
              <p className="mt-3 text-xl text-white">Acompanha cada contato até a venda e mostra onde o dinheiro está escapando.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Método */}
      <section id="metodo" className="scroll-mt-24">
        <div className="mx-auto max-w-7xl px-5 pt-20 md:px-6 md:pt-28">
          <Selo>Método Axven</Selo>
          <h2 className="mt-5 max-w-3xl text-4xl font-bold tracking-[-.035em] md:text-6xl">5 etapas do anúncio <span className="text-[#F2551F]">até o caixa.</span></h2>
          <p className="mt-5 text-sm text-[#63636C] motion-reduce:hidden">Role para ver o caminho de uma venda ↓</p>
        </div>
        <MetodoScroll etapas={etapas} />
      </section>

      {/* Axven Rastro */}
      <section className="border-y border-white/10 bg-[#111117]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 md:px-6 md:py-28 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
          <div>
            <Selo>Onde tudo acontece</Selo>
            <h2 className="mt-5 text-4xl font-bold tracking-[-.035em] md:text-5xl">Tudo isso roda no <span className="text-[#F2551F]">Axven Rastro.</span></h2>
            <p className="mt-6 max-w-md text-lg leading-8 text-[#9B9BA4]">Do anúncio até o caixa, nenhuma venda sem rastro.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {rastro.map(([t, d]) => (
              <article key={t} className="rounded-3xl border border-white/10 bg-[#17171D] p-7">
                <span className="block h-2 w-8 rounded-full bg-[#F2551F]" />
                <h3 className="mt-6 text-xl font-bold">{t}</h3>
                <p className="mt-3 leading-7 text-[#9B9BA4]">{d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Resultados */}
      <section id="resultados" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-20 md:px-6 md:py-28">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <Selo verde>Resultados</Selo>
            <h2 className="mt-5 max-w-3xl text-4xl font-bold tracking-[-.035em] md:text-5xl">O que a gente mede vai <span className="text-[#81F002]">até o faturamento.</span></h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-[#63636C]">Investimento → conversas → vendas → faturamento. Não paramos no clique. Clientes citados sem o nome, com dados do período indicado.</p>
        </div>
        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          <article className="rounded-[2rem] border border-white/10 bg-[#17171D] p-8 md:p-10">
            <p className="text-[11px] font-bold uppercase tracking-[.25em] text-[#63636C]">Rede de clínicas de estética · out/2026</p>
            <h3 className="mt-4 text-2xl font-bold">A venda chega depois.</h3>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-[#111117] p-5">
                <strong className="block text-5xl font-bold tracking-[-.04em] text-[#F2551F]">1.330</strong>
                <span className="mt-2 block text-sm leading-5 text-[#9B9BA4]">contatos no mês, +12% com 2% menos verba</span>
              </div>
              <div className="rounded-2xl border border-[#81F002]/60 bg-[#81F002]/[.05] p-5">
                <strong className="block text-5xl font-bold tracking-[-.04em] text-[#81F002]">7 de 8</strong>
                <span className="mt-2 block text-sm leading-5 text-[#9B9BA4]">vendas rastreadas vieram de contatos de agosto e setembro</span>
              </div>
            </div>
            <p className="mt-6 leading-7 text-[#9B9BA4]">Sem acompanhar até a venda, o anúncio que vendeu pareceria caro e seria desligado.</p>
          </article>
          <article className="rounded-[2rem] border border-white/10 bg-[#17171D] p-8 md:p-10">
            <p className="text-[11px] font-bold uppercase tracking-[.25em] text-[#63636C]">Clínica de estética · 01 a 15/09/2026</p>
            <h3 className="mt-4 text-2xl font-bold">O gargalo não era o anúncio.</h3>
            <div className="mt-8 space-y-2">
              {[["41", "contatos de anúncio", "w-full"], ["23", "queriam agendar", "w-[80%]"], ["7", "agendaram", "w-[60%]"]].map(([v, l, w], i) => (
                <div key={l} className={`${w} flex items-center gap-4 rounded-2xl px-5 py-4 ${i === 2 ? "border-2 border-[#F2551F] bg-[#F2551F]/10" : "border border-white/10 bg-[#111117]"}`}>
                  <strong className={`text-3xl font-bold ${i === 2 ? "text-[#F2551F]" : ""}`}>{v}</strong>
                  <span className="text-sm text-[#9B9BA4]">{l}</span>
                </div>
              ))}
            </div>
            <p className="mt-6 leading-7 text-[#9B9BA4]">Quem pedia o preço ficava sem um horário oferecido. Onde preço e horário vinham juntos, a paciente agendava rápido. Agora toda resposta leva o preço e 2 horários.</p>
          </article>
        </div>
      </section>

      {/* Para quem é */}
      <section className="border-y border-white/10 bg-[#111117]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 md:px-6 md:py-24 lg:grid-cols-2 lg:items-center">
          <div>
            <Selo>Para quem é</Selo>
            <h2 className="mt-5 text-4xl font-bold tracking-[-.035em] md:text-5xl">Negócios que <span className="text-[#F2551F]">vendem.</span></h2>
            <p className="mt-6 max-w-md text-lg leading-8 text-[#9B9BA4]">Qualquer ramo. O método é o mesmo; o que muda é o roteiro.</p>
          </div>
          <ul className="grid gap-4">
            {["pelo WhatsApp", "no presencial", "pelo site"].map((t) => (
              <li key={t} className="flex items-center gap-5 rounded-3xl border border-white/10 bg-[#17171D] px-7 py-6 text-2xl font-semibold">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border-2 border-[#F2551F] text-[#F2551F]">✓</span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Dúvidas */}
      <section id="duvidas" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-20 md:px-6 md:py-28">
        <Selo>Dúvidas</Selo>
        <h2 className="mt-5 text-4xl font-bold tracking-[-.035em] md:text-5xl">Perguntas que todo dono faz.</h2>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {duvidas.map(([p, r]) => (
            <details key={p} className="group rounded-3xl border border-white/10 bg-[#17171D] p-7 open:border-[#F2551F]/50">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-xl font-bold">
                {p}
                <span className="text-2xl text-[#F2551F] transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-4 leading-7 text-[#9B9BA4]">{r}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Sobre */}
      <section id="sobre" className="scroll-mt-24 border-y border-white/10 bg-[#111117]">
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-6 md:py-28">
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
            <div>
              <Selo>Sobre</Selo>
              <h2 className="mt-5 text-4xl font-bold tracking-[-.035em] md:text-5xl">Prazer, <span className="text-[#F2551F]">Hildeberto.</span></h2>
              <div className="mt-6 max-w-md space-y-4 text-lg leading-8 text-[#9B9BA4]">
                <p>A Axven nasceu da gestão de anúncios e cresceu para cuidar do caminho inteiro: do anúncio até a venda.</p>
                <p>Colocamos anúncio, atendimento e funil no mesmo lugar, achamos onde o dinheiro está se perdendo e mostramos o resultado em faturamento.</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {certificados.map((c, i) => (
                <article key={c.nome} className={`overflow-hidden rounded-3xl border bg-[#17171D] ${i === 0 ? "border-[#F2551F]" : "border-white/10"}`}>
                  <img src={c.img} alt={`Certificado: ${c.nome}`} className="aspect-[4/3] w-full object-cover" />
                  <div className="p-5">
                    <h3 className="font-bold">{c.nome}</h3>
                    <p className="mt-1 text-sm text-[#9B9BA4]">{c.info}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Chamada final */}
      <section className="bg-[#F2551F] text-[#0B0B0F]">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 px-5 py-16 md:flex-row md:items-center md:px-6">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.2em]">Diagnóstico gratuito</p>
            <h2 className="mt-3 max-w-3xl text-4xl font-bold tracking-[-.035em] md:text-5xl">Quer ver onde a sua venda está escapando?</h2>
            <p className="mt-4 text-lg font-medium">Call de 50 min com o Hildeberto, pelo Google Meet.</p>
          </div>
          <Botao claro>Chamar no WhatsApp ↗</Botao>
        </div>
      </section>

      <footer className="bg-[#0B0B0F]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 text-sm text-[#63636C] md:grid-cols-[1fr_auto] md:items-end md:px-6">
          <div>
            <img src={LOGO} alt="Axven Digital" className="h-8 w-auto opacity-90" />
            <p className="mt-5 text-base text-[#9B9BA4]">Crescimento não acontece por acaso. <span className="font-bold text-white">Ele é construído.</span></p>
            <p className="mt-3">© 2026 Axven Digital. Todos os direitos reservados.</p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <a href="https://instagram.com/axven_digital" target="_blank" rel="noreferrer" className="hover:text-white">@axven_digital</a>
            <a href={WHATS} target="_blank" rel="noreferrer" className="hover:text-white">WhatsApp</a>
            <Link href="/politica-de-privacidade" className="hover:text-white">Privacidade</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
