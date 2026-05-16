export type ExtraServiceUnit = 'UN' | 'POR_GHE' | 'POR_KM' | 'POR_FUNCIONARIO'

export interface ExtraService {
  id: string
  name: string
  unitValue: number
  unit: ExtraServiceUnit
  unitLabel: string
}

export interface ExtraServiceItem {
  service: ExtraService
  quantity: number
  totalValue: number
}

/**
 * Catálogo de Serviços Avulsos.
 * Estes itens estão INCLUSOS nos planos SST, mas podem ser contratados
 * individualmente quando o cliente não possui plano ou quer adicionar algo extra.
 */
export const EXTRA_SERVICES: ExtraService[] = [
  { id: 'es-01', name: 'Responsabilidade Técnica',   unitValue: 500.00,  unit: 'UN',              unitLabel: 'UN'              },
  { id: 'es-02', name: 'Entrega Técnica (TST)',       unitValue: 143.00,  unit: 'UN',              unitLabel: 'UN'              },
  { id: 'es-03', name: 'Avaliação de Ruído',          unitValue: 237.00,  unit: 'UN',              unitLabel: 'UN'              },
  { id: 'es-04', name: 'Quantificação de GHEs',       unitValue: 237.00,  unit: 'POR_GHE',         unitLabel: 'por GHE'         },
  { id: 'es-05', name: 'Laudo de Insalubridade',      unitValue: 290.00,  unit: 'UN',              unitLabel: 'UN (fixo)'       },
  { id: 'es-06', name: 'Laudo de Periculosidade',     unitValue: 250.00,  unit: 'POR_GHE',         unitLabel: 'por GHE'         },
  { id: 'es-07', name: 'Deslocamento',                unitValue: 2.10,    unit: 'POR_KM',          unitLabel: 'por KM'          },
  { id: 'es-08', name: 'CIPA',                        unitValue: 2500.00, unit: 'UN',              unitLabel: 'UN'              },
  { id: 'es-09', name: 'Visita Técnica Bimestral',    unitValue: 640.00,  unit: 'UN',              unitLabel: 'UN'              },
  { id: 'es-10', name: 'Psicossocial NR-01',          unitValue: 30.00,   unit: 'POR_FUNCIONARIO', unitLabel: 'por funcionário'  },
  { id: 'es-11', name: 'eSocial',                     unitValue: 15.00,   unit: 'POR_FUNCIONARIO', unitLabel: 'por funcionário'  },
  { id: 'es-12', name: 'Periódico',                   unitValue: 15.00,   unit: 'POR_FUNCIONARIO', unitLabel: 'por funcionário'  },
  { id: 'es-13', name: 'CAT',                         unitValue: 10.00,   unit: 'POR_FUNCIONARIO', unitLabel: 'por funcionário'  },
  { id: 'es-14', name: 'EPI',                         unitValue: 10.00,   unit: 'POR_FUNCIONARIO', unitLabel: 'por funcionário'  },
]
