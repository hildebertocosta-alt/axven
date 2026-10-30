import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import { AULA_COMUNIDADE_URL, AULA_DATA_TEXTO, AULA_GOOGLE_AGENDA_URL } from "../config";

const fonte = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Entre na comunidade da aula | Axven Digital",
  description: "Último passo da inscrição na aula ao vivo para clínicas de estética.",
  robots: { index: false, follow: false },
};

// Tela depois do formulário do Instagram: a Meta não aceita link de WhatsApp na tela final do formulário.
export default function ComunidadeDaAula() {
  return (
    <main className={`${fonte.className} flex min-h-screen items-center justify-center px-5 py-10`} style={{ color: "#140804", background: "linear-gradient(180deg, #FBE4D9 0%, #F6CDB9 100%)" }}>
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 h-1.5 w-14 rounded-full" style={{ background: "#F2551F" }} />
        <p className="text-sm" style={{ color: "#6E4535" }}>Inscrição feita.</p>
        <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight">Falta 1 passo: entre na comunidade da aula</h1>
        <p className="mx-auto mt-4 leading-7" style={{ color: "#6E4535" }}>É por lá que vão o link da aula e os avisos. {AULA_DATA_TEXTO}.</p>
        <a href={AULA_COMUNIDADE_URL} className="mt-8 flex w-full items-center justify-center rounded-xl px-6 py-5 text-lg font-semibold text-white transition hover:brightness-110" style={{ background: "#F2551F" }}>Entrar na comunidade do WhatsApp</a>
        <a href={AULA_GOOGLE_AGENDA_URL} target="_blank" rel="noopener noreferrer" className="mt-3 flex w-full items-center justify-center rounded-xl px-6 py-4 font-semibold" style={{ background: "#140804", color: "#FBE4D9" }}>Salvar na agenda</a>
      </div>
    </main>
  );
}
