import Script from "next/script";

// Axven Rastro: guarda a campanha da visita e põe o código do clique na mensagem do WhatsApp da Axven (8220).
// A chave é pública (como o ID do Pixel) e é da empresa "teste" do Rastro, onde o 8220 está conectado.
export default function RastroScript() {
  return <Script src="https://rastro.axvendigital.com.br/rastro.js" data-chave="RzfiQfCJzPr98EGh5NwP" strategy="afterInteractive" />;
}
