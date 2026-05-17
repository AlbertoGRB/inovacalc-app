/**
 * Busca endereço pelo CEP via API ViaCEP.
 * Usa AbortController (compatível com Hermes — sem AbortSignal.timeout).
 */

export interface ViaCEPResult {
  address: string;
  city: string;
  state: string;
}

export async function fetchAddressByCEP(cep: string): Promise<ViaCEPResult | null> {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);

  try {
    const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      signal: controller.signal,
    });
    const data = await response.json();
    if (data.erro) return null;
    return {
      address: `${data.logradouro ?? ''}${data.complemento ? `, ${data.complemento}` : ''}`,
      city: data.localidade ?? '',
      state: data.uf ?? '',
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
