import Script from "next/script";

// Axven Rastro: guarda a campanha da visita e põe o código do clique na mensagem do WhatsApp da empresa.
// A chave é pública (como o ID do Pixel). Padrão: empresa "teste" do Rastro, onde o 8220 está conectado
// (/clinicas e /analise). A página inicial usa a chave da empresa "axven-digital" (WhatsApp 99849).
export const CHAVE_RASTRO_TESTE = "RzfiQfCJzPr98EGh5NwP";
export const CHAVE_RASTRO_AXVEN_DIGITAL = "PVF5TNGOv3ybtqpqbKwL";

export default function RastroScript({ chave = CHAVE_RASTRO_TESTE }: { chave?: string }) {
  return <Script src="https://rastro.axvendigital.com.br/rastro.js" data-chave={chave} strategy="afterInteractive" />;
}
