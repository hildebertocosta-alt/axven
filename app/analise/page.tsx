"use client";

import Script from "next/script";
import DiagnosticForm from "./DiagnosticForm";

const META_PIXEL_ID = "3457772717706355";

export default function AnalisePage() {
  return (
    <>
      <Script id="meta-pixel-axven-analise" strategy="afterInteractive">{`
        !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
        n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${META_PIXEL_ID}');
        fbq('track', 'PageView');
      `}</Script>
      <noscript><img height="1" width="1" style={{ display: "none" }} src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`} alt="" /></noscript>
      <main className="min-h-screen bg-[#0B0B0F] text-[#F5F5F7]">
        <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-5 py-8 md:px-8 md:py-12">
          <header className="flex items-center justify-between">
            <div className="text-xl font-semibold tracking-[0.18em]">AXVEN</div>
            <div className="rounded-full border border-[#2A2A32] bg-[#111117] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#FF7A57]">Análise de Crescimento</div>
          </header>
          <DiagnosticForm />
          <footer className="mt-auto pt-10 text-center text-xs text-[#5F5F68]">AXVEN DIGITAL • Estratégia + Tecnologia + Performance</footer>
        </div>
      </main>
    </>
  );
}
