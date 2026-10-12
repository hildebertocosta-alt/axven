import { apagarEstado, clienteAdmin, limparDadosDeTeste } from "./apoio/dadosTeste";

export default async function globalTeardown() {
  try {
    await limparDadosDeTeste(clienteAdmin());
  } finally {
    apagarEstado();
  }
}
