/**
 * Consulta dados de empresa por CNPJ via API OpenCNPJ.
 * GET https://api.opencnpj.org/{CNPJ}
 * Sem autenticação. 200 = encontrado, 404 = não encontrado.
 * Usa AbortController (compatível com Hermes).
 */

export interface OpenCNPJResult {
  razaoSocial: string;
  nomeFantasia: string;
  situacao: string;
  cnae: string;
  cnaeDescricao: string;
  uf: string;
  municipio: string;
  porte: string;
}

export async function fetchCNPJData(cnpj: string): Promise<OpenCNPJResult | null> {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch(
      `https://api.opencnpj.org/${digits}?dataset=receita`,
      { signal: controller.signal },
    );
    if (!response.ok) return null;

    const data = await response.json();
    const cnaeCode = data.cnae_principal ?? '';

    // Try to fetch CNAE description from IBGE API
    let cnaeDescricao = '';
    if (cnaeCode) {
      try {
        const cnaeCtrl = new AbortController();
        const cnaeTimeout = setTimeout(() => cnaeCtrl.abort(), 5_000);
        const cnaeResp = await fetch(
          `https://servicodados.ibge.gov.br/api/v2/cnae/subclasses/${cnaeCode}`,
          { signal: cnaeCtrl.signal },
        );
        clearTimeout(cnaeTimeout);
        if (cnaeResp.ok) {
          const cnaeData = await cnaeResp.json();
          cnaeDescricao = cnaeData.descricao ?? '';
        }
      } catch {
        // IBGE API failed — use code only
      }
    }

    return {
      razaoSocial: data.razao_social ?? '',
      nomeFantasia: data.nome_fantasia ?? '',
      situacao: data.situacao_cadastral ?? '',
      cnae: cnaeCode,
      cnaeDescricao,
      uf: data.uf ?? '',
      municipio: data.municipio ?? '',
      porte: data.porte_empresa ?? '',
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
