import { PlanConfig, TrainingDiscount } from '@/types/database';

export const RISK_GRADE_LABELS: Record<number, string> = {
  1: 'Grau 1',
  2: 'Grau 2',
  3: 'Grau 3',
  4: 'Grau 4',
};

export const STATUS_CONFIG = {
  ACTIVE:   { label: 'Ativo',     bg: '#dcfce7', text: '#166534' },
  INACTIVE: { label: 'Inativo',   bg: '#f1f5f9', text: '#475569' },
  PROSPECT: { label: 'Prospect',  bg: '#fef9c3', text: '#713f12' },
} as const;

export const QUOTE_STATUS_CONFIG = {
  DRAFT:    { label: 'Rascunho',  bg: '#f1f5f9', text: '#475569' },
  SENT:     { label: 'Enviado',   bg: '#dbeafe', text: '#1e40af' },
  APPROVED: { label: 'Aprovado',  bg: '#dcfce7', text: '#166534' },
  REJECTED: { label: 'Rejeitado', bg: '#fee2e2', text: '#991b1b' },
  EXPIRED:  { label: 'Expirado',  bg: '#ffedd5', text: '#9a3412' },
} as const;

export const QUOTE_TYPE_LABELS: Record<string, string> = {
  PLAN:     'Plano',
  TRAINING: 'Treinamentos',
  BOTH:     'Plano + Treino',
};

export const CLIENT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'NONE',     label: 'Sem Plano' },
  { value: 'ESSENCIAL', label: 'Essencial' },
  { value: 'INTEGRAL',  label: 'Integral' },
  { value: 'AVANCADO',  label: 'Avançado' },
];

export const PLAN_COLORS = {
  essencial: '#70A400',
  integral:  '#0070C0',
  avancado:  '#7030A0',
};

// Fallbacks para quando o Supabase não estiver disponível
export const DEFAULT_PLAN_CONFIGS: PlanConfig[] = [
  { id: '1',  key: 'margem_g1',            name: 'Margem G1',                    value: 40,    category: 'margem',      description: null, updated_by: '', updated_at: '' },
  { id: '2',  key: 'margem_g2',            name: 'Margem G2',                    value: 60,    category: 'margem',      description: null, updated_by: '', updated_at: '' },
  { id: '3',  key: 'margem_g3',            name: 'Margem G3',                    value: 60,    category: 'margem',      description: null, updated_by: '', updated_at: '' },
  { id: '4',  key: 'margem_g4',            name: 'Margem G4',                    value: 80,    category: 'margem',      description: null, updated_by: '', updated_at: '' },
  { id: '5',  key: 'imposto',              name: 'Imposto',                      value: 8,     category: 'imposto',     description: null, updated_by: '', updated_at: '' },
  { id: '6',  key: 'resp_tecnica',         name: 'Resp. Técnica',                value: 500,   category: 'fixo',        description: null, updated_by: '', updated_at: '' },
  { id: '7',  key: 'tst_g1',              name: 'TST GR1',                      value: 143,   category: 'fixo',        description: null, updated_by: '', updated_at: '' },
  { id: '8',  key: 'tst_g2',              name: 'TST GR2',                      value: 143,   category: 'fixo',        description: null, updated_by: '', updated_at: '' },
  { id: '9',  key: 'tst_g3',              name: 'TST GR3',                      value: 143,   category: 'fixo',        description: null, updated_by: '', updated_at: '' },
  { id: '10', key: 'tst_g4',              name: 'TST GR4',                      value: 148,   category: 'fixo',        description: null, updated_by: '', updated_at: '' },
  { id: '11', key: 'art_g1',              name: 'ART GR1',                      value: 0,     category: 'fixo',        description: null, updated_by: '', updated_at: '' },
  { id: '12', key: 'art_g2',              name: 'ART GR2',                      value: 0,     category: 'fixo',        description: null, updated_by: '', updated_at: '' },
  { id: '13', key: 'art_g3',              name: 'ART GR3',                      value: 220,   category: 'fixo',        description: null, updated_by: '', updated_at: '' },
  { id: '14', key: 'art_g4',              name: 'ART GR4',                      value: 210,   category: 'fixo',        description: null, updated_by: '', updated_at: '' },
  { id: '15', key: 'ruido',               name: 'Ruído',                        value: 237,   category: 'fixo',        description: null, updated_by: '', updated_at: '' },
  { id: '16', key: 'cipa',                name: 'CIPA',                         value: 2500,  category: 'fixo',        description: null, updated_by: '', updated_at: '' },
  { id: '17', key: 'visita_tecnica',      name: 'Visita Técnica',               value: 640,   category: 'fixo',        description: null, updated_by: '', updated_at: '' },
  { id: '18', key: 'hora_tecnica',        name: 'Hora Técnica',                 value: 40,    category: 'unidade',     description: null, updated_by: '', updated_at: '' },
  { id: '19', key: 'quantificacao',       name: 'Quantificação',                value: 237,   category: 'unidade',     description: null, updated_by: '', updated_at: '' },
  { id: '20', key: 'deslocamento_km',     name: 'Deslocamento/km',              value: 2.1,   category: 'unidade',     description: null, updated_by: '', updated_at: '' },
  { id: '21', key: 'deslocamento_integral', name: 'Deslocamento Integral/km',   value: 3.1,   category: 'unidade',     description: null, updated_by: '', updated_at: '' },
  { id: '22', key: 'auditoria_esocial',   name: 'Auditoria e-Social',           value: 500,   category: 'fixo',        description: null, updated_by: '', updated_at: '' },
  { id: '23', key: 'gestao_base',         name: 'Gestão Base (≤10)',            value: 150,   category: 'fixo',        description: null, updated_by: '', updated_at: '' },
  { id: '24', key: 'gestao_por_funcionario', name: 'Gestão por Func (>10)',     value: 10,    category: 'funcionario', description: null, updated_by: '', updated_at: '' },
];

export const DEFAULT_TRAINING_DISCOUNTS: TrainingDiscount[] = [
  { id: '1', plan_type: 'NONE',      discount_percent: 0,  updated_at: '' },
  { id: '2', plan_type: 'ESSENCIAL', discount_percent: 20, updated_at: '' },
  { id: '3', plan_type: 'INTEGRAL',  discount_percent: 30, updated_at: '' },
  { id: '4', plan_type: 'AVANCADO',  discount_percent: 40, updated_at: '' },
];
