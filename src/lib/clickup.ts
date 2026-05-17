/**
 * Integração com ClickUp — sincroniza empresas do InovaCalc como tasks
 * na lista "Oportunidades Comerciais" com custom fields.
 *
 * Workspace: 9013953440 (Inovassie)
 * Space: Comercial (901313701146)
 * List: Oportunidades Comerciais (901326564999)
 *
 * REGRAS:
 * - Nunca duplicar tasks: busca por CNPJ/CPF antes de criar
 * - Se encontrar, atualiza a task existente (sem mudar posição)
 * - Origem do Lead sempre = "InovaCalc"
 * - Plano atualizado quando orçamento é criado
 */

import { logger } from '@/lib/logger';

const TAG = 'clickup';

const CLICKUP_API = 'https://api.clickup.com/api/v2';
const CLICKUP_API_KEY = 'pk_182531685_IRQT988R2QJ3R9FYPHU669PAG97JR3NX';
const CLICKUP_LIST_ID = '901326564999';

// ─── Custom Field IDs ───────────────────────────────────────────────────────

const FIELDS = {
  NOME_EMPRESA:       'd8643151-57f3-473a-80f3-83c217fe717b', // short_text
  CNPJ:               'a664c6e1-4fc6-4bd7-8c2d-226ee185142d', // short_text
  RESPONSAVEL:        '995830c4-b151-40d9-b3aa-0f841d80c20a', // short_text
  EMAIL:              '32f13c13-f5b0-4944-b5b2-6c38b6567aac', // short_text
  TELEFONE:           '0e7a7ec5-981a-409c-901b-1ed37aff82e4', // phone
  WHATSAPP:           '0ec59cde-c222-4fe0-adb6-9b3f7a1bc646', // phone
  TELEFONE_CONTAB:    '803ae07c-db75-48eb-836a-92d04b87ee9d', // phone
  ENDERECO:           '2dc3e6b3-14f5-4bd8-90d4-e070d2e374f6', // location
  QTD_FUNCIONARIOS:   'e8ee2671-24de-4df5-b005-69655cae6840', // short_text
  FUNCOES_CARGOS:     '79a637ef-3c32-4ee4-a9d1-d5393545e294', // short_text
  LOCAIS_SERVICO:     '5ea1dd1d-4b1a-4831-a884-63060f63bde9', // short_text
  NECESSIDADE:        '20f42489-c1a5-444d-8b63-ca635dfeaf5f', // short_text
  COMO_CONHECEU:      '8408be22-9635-4c15-94e2-7b6367b3f22a', // short_text
  POSSUI_MAQUINAS:    '36c216bc-bbf6-4c32-91ef-5f9d21343063', // drop_down
  SE_SIM_QUAIS:       'af308c90-7f78-4b65-a898-aab61844348e', // short_text
  VALOR_PS:           '6435186c-6ecf-4052-81ad-47de97f322de', // currency BRL
  PLANO:              'a034d0c5-8127-454b-9e86-86858cc97558', // drop_down
  PERICIA:            '0e359090-f4f4-454f-a1c4-fbeec1d7ad8a', // drop_down
  UNIDADE_PROSPEC:    '1cdd1f3a-8d32-438d-8a07-e622297409f0', // drop_down
  ORIGEM_LEAD:        'b299aaee-ca75-4083-864c-c6f9de5cf16e', // drop_down
  QUAL_CIDADE:        'ef4299d9-3db8-47b7-8248-b2f30b592231', // drop_down
  DIAS_RENOVACAO:     '1d514c9e-5d4e-435f-9cdb-95c4e4a3bd6a', // date
  DATA_ASSINATURA:    'ac791319-3f99-4306-97ec-fa6145c4570e', // date
  AGENDAR_REUNIAO:    '4f16a9ec-a9aa-46c4-8da9-c0859f253490', // date
  FACEBOOK:           '17235f12-edd9-45c1-b383-2cf4a66e5c45', // url
  INSTAGRAM:          'c888c32a-51fa-41dc-8f4e-8de2bd4785fd', // url
  ANEXOS_FINANCEIRO:  '41806325-fa03-41be-99a5-909f065aebcb', // attachment
  ANEXOS_SST:         'cef261c2-4bfe-4d3c-bd17-fd139d17f45a', // attachment
} as const;

// ─── Dropdown Option IDs ────────────────────────────────────────────────────

// Origem do LEAD → "InovaCalc"
const ORIGEM_LEAD_INOVACALC = 'e71f4721-6b05-4c88-89c0-461936b9aa4e';

// Plano → option IDs mapeados pelo tipo do app
const PLANO_OPTIONS: Record<string, string> = {
  ESSENCIAL: '4fd64c31-9cfb-4055-832b-3facf144df96', // Plano Essencial
  INTEGRAL:  '48699b53-c421-4161-824e-db9480ab3ce9', // Plano Integral
  // Para AVANÇADO, decide-se com/sem treinamento no momento do orçamento
  AVANCADO_SEM_TREINO: 'bd23f445-8ad3-485f-9c8d-0f896946d7f3', // Plano Avançado - Sem Treinamentos
  AVANCADO_COM_TREINO: '8ec6da72-cb84-4ae8-aeb8-525c3d829ad3', // Plano Avançado - Com Treinamentos
};

// Unidade de Prospecção
const UNIDADE_OPTIONS: Record<string, string> = {
  'frutal':    '1620e645-2f78-4c4f-8d39-7ee360701b95',
  'fronteira': '45a28c64-0aa3-4dbb-a6cb-a58733f10a3c',
};

// Qual Cidade
const CITY_OPTIONS: Record<string, string> = {
  'frutal':              'bb28ad4e-0b38-4611-b4c8-8e37e3cbbdf6',
  'fronteira':           '80404b08-c0a7-41b9-980a-ee86d5849a4a',
  'fronteira (nautico)': '27ebf29e-43a5-4670-9e32-52b9cd65985b',
  'final da linha':      '2c840f26-c2b1-49d4-924b-6a09195efe02',
  'pirajuba':            'cf2e360e-8432-4c6f-bb48-3d2823e1a30f',
  'planura':             '3032ec9c-0400-4bb8-ac8e-0b1043981510',
  'aparecida de minas':  '5425360b-de1d-4c13-a2c1-c2613f511e2f',
  'uberaba':             'f629dfa9-a0af-4958-94b0-a77ab6246f29',
  'campina verde':       '6ab0ce17-4566-4b8c-955d-2fa95d27f060',
  'iturama':             '543a1f0e-006d-4fe1-bb23-75da8b2ec137',
  'carneirinho':         'c2204703-4479-486c-af59-b577ec22e4a9',
  'limeira do oeste':    '37e090f3-663c-492d-ae91-98b5bbd2b7bb',
  'itapagipe':           '98cbe8ca-8c74-4050-92f0-2e9da905416a',
  'comendador gomes':    '4d1317f1-ba2a-433f-8511-73688615f284',
  'icem':                'e7f6130f-a1f4-492c-aa64-170ae473569f',
  'sao jose do rio preto':'c8f7619a-f07e-4f09-869c-d79432968e60',
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface CompanyData {
  company_name: string;
  trade_name?: string | null;
  cnpj?: string | null;
  cpf?: string | null;
  contact_name?: string | null;
  contact_role?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  sector?: string | null;
  employee_count?: number | null;
  risk_grade?: number | null;
  notes?: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCNPJ(v: string): string {
  const d = v.replace(/\D/g, '');
  if (d.length !== 14) return v;
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

function formatCPF(v: string): string {
  const d = v.replace(/\D/g, '');
  if (d.length !== 11) return v;
  return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}

function formatPhone(v: string): string {
  const d = v.replace(/\D/g, '');
  if (d.length >= 10) return `+55${d}`;
  return d;
}

function normalize(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function buildCustomFields(data: CompanyData): Array<{ id: string; value: any }> {
  const fields: Array<{ id: string; value: any }> = [];

  // Nome da Empresa
  fields.push({ id: FIELDS.NOME_EMPRESA, value: data.company_name });

  // CNPJ / CPF
  if (data.cnpj) {
    fields.push({ id: FIELDS.CNPJ, value: formatCNPJ(data.cnpj) });
  } else if (data.cpf) {
    fields.push({ id: FIELDS.CNPJ, value: `CPF: ${formatCPF(data.cpf)}` });
  }

  // Responsável
  if (data.contact_name) {
    const val = data.contact_role
      ? `${data.contact_name} (${data.contact_role})`
      : data.contact_name;
    fields.push({ id: FIELDS.RESPONSAVEL, value: val });
  }

  // E-mail
  if (data.email) {
    fields.push({ id: FIELDS.EMAIL, value: data.email });
  }

  // Telefone + WhatsApp (mesmo número)
  if (data.phone) {
    const phone = formatPhone(data.phone);
    fields.push({ id: FIELDS.TELEFONE, value: phone });
    fields.push({ id: FIELDS.WHATSAPP, value: phone });
  }

  // Endereço (location field)
  if (data.address) {
    const full = [
      data.address,
      data.city && data.state ? `${data.city}/${data.state}` : data.city || '',
      data.zip_code || '',
    ].filter(Boolean).join(', ');
    fields.push({ id: FIELDS.ENDERECO, value: { formatted_address: full } });
  }

  // Quantidade de funcionários
  if (data.employee_count != null && data.employee_count > 0) {
    fields.push({ id: FIELDS.QTD_FUNCIONARIOS, value: String(data.employee_count) });
  }

  // Setor / CNAE → Funções/cargos (campo mais próximo)
  if (data.sector) {
    fields.push({ id: FIELDS.FUNCOES_CARGOS, value: data.sector });
  }

  // Origem do Lead → sempre "InovaCalc"
  fields.push({ id: FIELDS.ORIGEM_LEAD, value: ORIGEM_LEAD_INOVACALC });

  // Como conheceu → "InovaCalc - App Mobile"
  fields.push({ id: FIELDS.COMO_CONHECEU, value: 'InovaCalc - App Mobile' });

  // Qual Cidade (dropdown)
  if (data.city) {
    const key = normalize(data.city);
    const optionId = CITY_OPTIONS[key];
    if (optionId) {
      fields.push({ id: FIELDS.QUAL_CIDADE, value: optionId });
    }
  }

  // Unidade de Prospecção (baseada na cidade)
  if (data.city) {
    const key = normalize(data.city);
    if (key === 'fronteira' || key === 'fronteira (nautico)') {
      fields.push({ id: FIELDS.UNIDADE_PROSPEC, value: UNIDADE_OPTIONS['fronteira'] });
    } else {
      // Default: Frutal
      fields.push({ id: FIELDS.UNIDADE_PROSPEC, value: UNIDADE_OPTIONS['frutal'] });
    }
  }

  return fields;
}

function buildDescription(data: CompanyData): string {
  const parts: string[] = [];
  if (data.trade_name) parts.push(`Nome Fantasia: ${data.trade_name}`);
  if (data.risk_grade != null) parts.push(`Grau de Risco: G${data.risk_grade}`);
  if (data.notes) parts.push(`Obs: ${data.notes}`);
  if (data.city && data.state) parts.push(`${data.city}/${data.state}`);
  if (data.zip_code) parts.push(`CEP: ${data.zip_code}`);
  parts.push('\n📱 Criado via InovaCalc Mobile');
  return parts.join('\n');
}

// ─── Fetch helper ───────────────────────────────────────────────────────────

async function clickupFetch(
  url: string,
  options: RequestInit,
  timeoutMs = 10_000,
): Promise<Response | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: CLICKUP_API_KEY,
        ...options.headers,
      },
      signal: controller.signal,
    });
    return resp;
  } catch (e) {
    logger.warn(TAG, `Fetch falhou: ${url}`, e);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Anti-duplicata: busca task existente por nome/CNPJ ─────────────────────

async function findExistingTask(data: CompanyData): Promise<string | null> {
  try {
    // Busca tasks na lista pelo nome da empresa
    const resp = await clickupFetch(
      `${CLICKUP_API}/list/${CLICKUP_LIST_ID}/task?` +
        `include_closed=true&subtasks=false`,
      { method: 'GET' },
      15_000,
    );
    if (!resp?.ok) return null;

    const result = await resp.json();
    const tasks: any[] = result.tasks ?? [];

    const cnpjDigits = data.cnpj?.replace(/\D/g, '') ?? '';
    const cpfDigits = data.cpf?.replace(/\D/g, '') ?? '';
    const nameNorm = normalize(data.company_name);

    for (const task of tasks) {
      // Match por nome exato
      if (normalize(task.name) === nameNorm) {
        return task.id;
      }
      // Match por CNPJ no custom field
      if (cnpjDigits || cpfDigits) {
        const fields: any[] = task.custom_fields ?? [];
        const cnpjField = fields.find((f: any) => f.id === FIELDS.CNPJ);
        if (cnpjField?.value) {
          const fieldDigits = cnpjField.value.replace(/\D/g, '');
          if (cnpjDigits && fieldDigits === cnpjDigits) return task.id;
          if (cpfDigits && fieldDigits === cpfDigits) return task.id;
        }
      }
    }
    return null;
  } catch (e) {
    logger.warn(TAG, 'Erro ao buscar task existente', e);
    return null;
  }
}

// ─── Atualiza custom fields de uma task (sem mudar posição) ─────────────────

async function setCustomFields(taskId: string, fields: Array<{ id: string; value: any }>) {
  for (const field of fields) {
    await clickupFetch(
      `${CLICKUP_API}/task/${taskId}/field/${field.id}`,
      { method: 'POST', body: JSON.stringify({ value: field.value }) },
    );
  }
}

// ─── API pública ────────────────────────────────────────────────────────────

/**
 * Cria ou atualiza uma task no ClickUp representando uma empresa.
 * - Busca task existente (por nome ou CNPJ) antes de criar
 * - Se encontrar, atualiza sem mudar posição
 * - Se não encontrar, cria nova com status "lead recebido"
 * Retorna o task_id.
 */
export async function createClickUpCompany(data: CompanyData): Promise<string | null> {
  try {
    // Anti-duplicata: busca task existente
    const existingId = await findExistingTask(data);

    if (existingId) {
      logger.info(TAG, `Task existente encontrada: ${existingId} — atualizando`);
      await updateClickUpCompany(existingId, data);
      return existingId;
    }

    // Cria nova task
    const body = {
      name: data.company_name,
      description: buildDescription(data),
      status: 'lead recebido',
      custom_fields: buildCustomFields(data),
    };

    const response = await clickupFetch(
      `${CLICKUP_API}/list/${CLICKUP_LIST_ID}/task`,
      { method: 'POST', body: JSON.stringify(body) },
    );

    if (!response || !response.ok) {
      const text = response ? await response.text() : 'no response';
      logger.warn(TAG, `Erro ao criar task: ${response?.status}`, text);
      return null;
    }

    const result = await response.json();
    logger.info(TAG, `Task criada: ${result.id} — ${data.company_name}`);
    return result.id as string;
  } catch (e) {
    logger.warn(TAG, 'Falha ao criar task no ClickUp', e);
    return null;
  }
}

/**
 * Atualiza uma task existente (nome + descrição + custom fields).
 * NÃO altera status nem posição da task.
 */
export async function updateClickUpCompany(taskId: string, data: CompanyData): Promise<boolean> {
  try {
    // Atualiza nome + descrição (sem mudar status/posição)
    const response = await clickupFetch(
      `${CLICKUP_API}/task/${taskId}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          name: data.company_name,
          description: buildDescription(data),
        }),
      },
    );
    if (!response?.ok) {
      logger.warn(TAG, `Erro ao atualizar task ${taskId}: ${response?.status}`);
      return false;
    }

    // Atualiza custom fields individualmente (não altera posição)
    await setCustomFields(taskId, buildCustomFields(data));

    logger.info(TAG, `Task ${taskId} atualizada`);
    return true;
  } catch (e) {
    logger.warn(TAG, 'Falha ao atualizar ClickUp', e);
    return false;
  }
}

/**
 * Exclui a task do ClickUp associada a uma empresa.
 */
export async function deleteClickUpCompany(taskId: string): Promise<boolean> {
  try {
    const response = await clickupFetch(
      `${CLICKUP_API}/task/${taskId}`,
      { method: 'DELETE' },
    );
    if (!response?.ok) {
      logger.warn(TAG, `Erro ao excluir task ${taskId}: ${response?.status}`);
      return false;
    }
    logger.info(TAG, `Task ${taskId} excluída`);
    return true;
  } catch (e) {
    logger.warn(TAG, 'Falha ao excluir task no ClickUp', e);
    return false;
  }
}

/**
 * Atualiza o campo "Valor P&S." (currency BRL) na task.
 * Chamado quando um orçamento é criado.
 */
export async function updateClickUpQuoteValue(
  taskId: string,
  _data: CompanyData,
  totalValueNumber: number,
): Promise<boolean> {
  try {
    const response = await clickupFetch(
      `${CLICKUP_API}/task/${taskId}/field/${FIELDS.VALOR_PS}`,
      { method: 'POST', body: JSON.stringify({ value: totalValueNumber }) },
    );
    if (!response?.ok) {
      logger.warn(TAG, `Erro ao atualizar valor ${taskId}: ${response?.status}`);
      return false;
    }
    logger.info(TAG, `Valor P&S atualizado: R$ ${totalValueNumber}`);
    return true;
  } catch (e) {
    logger.warn(TAG, 'Falha ao atualizar valor no ClickUp', e);
    return false;
  }
}

/**
 * Atualiza o campo "Plano" (dropdown) na task.
 * Chamado quando um orçamento com plano é criado.
 * @param planType — 'ESSENCIAL' | 'INTEGRAL' | 'AVANCADO'
 * @param hasTrainings — se o orçamento inclui treinamentos (para AVANÇADO)
 */
export async function updateClickUpPlan(
  taskId: string,
  planType: string,
  hasTrainings: boolean,
): Promise<boolean> {
  let optionId: string | undefined;

  if (planType === 'ESSENCIAL') {
    optionId = PLANO_OPTIONS.ESSENCIAL;
  } else if (planType === 'INTEGRAL') {
    optionId = PLANO_OPTIONS.INTEGRAL;
  } else if (planType === 'AVANCADO') {
    optionId = hasTrainings
      ? PLANO_OPTIONS.AVANCADO_COM_TREINO
      : PLANO_OPTIONS.AVANCADO_SEM_TREINO;
  }

  if (!optionId) return false;

  try {
    const response = await clickupFetch(
      `${CLICKUP_API}/task/${taskId}/field/${FIELDS.PLANO}`,
      { method: 'POST', body: JSON.stringify({ value: optionId }) },
    );
    if (!response?.ok) {
      logger.warn(TAG, `Erro ao atualizar plano ${taskId}: ${response?.status}`);
      return false;
    }
    logger.info(TAG, `Plano atualizado: ${planType}`);
    return true;
  } catch (e) {
    logger.warn(TAG, 'Falha ao atualizar plano no ClickUp', e);
    return false;
  }
}
