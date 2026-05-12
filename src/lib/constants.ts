import { PlanConfig, GheTable, TrainingDiscount } from '@/types/database';

export const CIPA_RULES: Record<number, number> = { 1: 81, 2: 51, 3: 20, 4: 20 };

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
  { id: '1',  key: 'margem_g1',      name: 'Margem G1',         value: 40,   category: 'margem',      description: null, updated_by: '', updated_at: '' },
  { id: '2',  key: 'margem_g2',      name: 'Margem G2',         value: 60,   category: 'margem',      description: null, updated_by: '', updated_at: '' },
  { id: '3',  key: 'margem_g3',      name: 'Margem G3',         value: 60,   category: 'margem',      description: null, updated_by: '', updated_at: '' },
  { id: '4',  key: 'margem_g4',      name: 'Margem G4',         value: 80,   category: 'margem',      description: null, updated_by: '', updated_at: '' },
  { id: '5',  key: 'imposto',        name: 'Imposto',           value: 8,    category: 'imposto',     description: null, updated_by: '', updated_at: '' },
  { id: '6',  key: 'resp_tecnica',   name: 'Resp. Técnica',     value: 500,  category: 'fixo',        description: null, updated_by: '', updated_at: '' },
  { id: '7',  key: 'tst',            name: 'TST',               value: 143,  category: 'fixo',        description: null, updated_by: '', updated_at: '' },
  { id: '8',  key: 'ruido',          name: 'Ruído',             value: 237,  category: 'fixo',        description: null, updated_by: '', updated_at: '' },
  { id: '9',  key: 'cipa',           name: 'CIPA',              value: 2500, category: 'fixo',        description: null, updated_by: '', updated_at: '' },
  { id: '10', key: 'visita_tecnica', name: 'Visita Técnica',    value: 640,  category: 'fixo',        description: null, updated_by: '', updated_at: '' },
  { id: '11', key: 'quantificacao',  name: 'Quantificação',     value: 237,  category: 'unidade',     description: null, updated_by: '', updated_at: '' },
  { id: '12', key: 'insalubridade',  name: 'Insalubridade',     value: 290,  category: 'unidade',     description: null, updated_by: '', updated_at: '' },
  { id: '13', key: 'periculosidade', name: 'Periculosidade',    value: 250,  category: 'unidade',     description: null, updated_by: '', updated_at: '' },
  { id: '14', key: 'deslocamento_km',name: 'Deslocamento/km',   value: 2.1,  category: 'unidade',     description: null, updated_by: '', updated_at: '' },
  { id: '15', key: 'nr01',           name: 'NR01',              value: 30,   category: 'funcionario', description: null, updated_by: '', updated_at: '' },
  { id: '16', key: 'esocial',        name: 'eSocial',           value: 15,   category: 'funcionario', description: null, updated_by: '', updated_at: '' },
  { id: '17', key: 'periodico',      name: 'Periódico',         value: 15,   category: 'funcionario', description: null, updated_by: '', updated_at: '' },
  { id: '18', key: 'cat',            name: 'CAT',               value: 10,   category: 'funcionario', description: null, updated_by: '', updated_at: '' },
  { id: '19', key: 'epi',            name: 'EPI',               value: 10,   category: 'funcionario', description: null, updated_by: '', updated_at: '' },
];

export const DEFAULT_GHE_TABLE: GheTable[] = [
  { id: '1',  risk_grade: 1, function_range: 5,  hours: 3,  value: 120,  updated_at: '' },
  { id: '2',  risk_grade: 2, function_range: 5,  hours: 3,  value: 120,  updated_at: '' },
  { id: '3',  risk_grade: 3, function_range: 5,  hours: 10, value: 400,  updated_at: '' },
  { id: '4',  risk_grade: 4, function_range: 5,  hours: 10, value: 400,  updated_at: '' },
  { id: '5',  risk_grade: 1, function_range: 10, hours: 20, value: 800,  updated_at: '' },
  { id: '6',  risk_grade: 2, function_range: 10, hours: 20, value: 800,  updated_at: '' },
  { id: '7',  risk_grade: 3, function_range: 10, hours: 28, value: 1120, updated_at: '' },
  { id: '8',  risk_grade: 4, function_range: 10, hours: 28, value: 1120, updated_at: '' },
  { id: '9',  risk_grade: 1, function_range: 20, hours: 32, value: 1280, updated_at: '' },
  { id: '10', risk_grade: 2, function_range: 20, hours: 32, value: 1280, updated_at: '' },
  { id: '11', risk_grade: 3, function_range: 20, hours: 48, value: 1920, updated_at: '' },
  { id: '12', risk_grade: 4, function_range: 20, hours: 48, value: 1920, updated_at: '' },
];

export const DEFAULT_TRAINING_DISCOUNTS: TrainingDiscount[] = [
  { id: '1', plan_type: 'NONE',      discount_percent: 0,  updated_at: '' },
  { id: '2', plan_type: 'ESSENCIAL', discount_percent: 20, updated_at: '' },
  { id: '3', plan_type: 'INTEGRAL',  discount_percent: 30, updated_at: '' },
  { id: '4', plan_type: 'AVANCADO',  discount_percent: 40, updated_at: '' },
];
