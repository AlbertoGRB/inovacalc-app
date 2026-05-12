import { Training } from '@/types/database';

/**
 * Catálogo de treinamentos hardcoded (combos + NRs individuais).
 * Cada combo lista em `combo_items` os códigos das NRs que ele contém,
 * para que sejam desabilitadas quando o combo estiver selecionado.
 */
export const DEFAULT_TRAININGS: Training[] = [
  // ── COMBOS ──
  { id: 't-combo-integ', code: 'INTEGRACAO', description: 'Integração Geral (NR-01 + NR-06 + NR-17)', value: 150, is_combo: true, combo_items: ['NR-01','NR-06','NR-17'], excludes: null, order_index: 1, is_active: true, updated_at: '' },
  { id: 't-combo-altura',code: 'COMBO-ALT',  description: 'Combo Altura (NR-35 + NR-18)',           value: 280, is_combo: true, combo_items: ['NR-35','NR-18'],         excludes: null, order_index: 2, is_active: true, updated_at: '' },
  { id: 't-combo-eletr', code: 'COMBO-ELE',  description: 'Combo Elétrica (NR-10 + NR-10SEP)',  value: 950, is_combo: true, combo_items: ['NR-10','NR-10SEP'],      excludes: null, order_index: 3, is_active: true, updated_at: '' },

  // ── NRs individuais ──
  { id: 't-nr01', code: 'NR-01', description: 'Disposições Gerais e GRO',           value: 80,  is_combo: false, combo_items: null, excludes: null, order_index: 10, is_active: true, updated_at: '' },
  { id: 't-nr04', code: 'NR-04', description: 'SESMT',                                       value: 200, is_combo: false, combo_items: null, excludes: null, order_index: 11, is_active: true, updated_at: '' },
  { id: 't-nr05', code: 'NR-05', description: 'CIPA',                                         value: 350, is_combo: false, combo_items: null, excludes: null, order_index: 12, is_active: true, updated_at: '' },
  { id: 't-nr06', code: 'NR-06', description: 'EPI',                                          value: 90,  is_combo: false, combo_items: null, excludes: null, order_index: 13, is_active: true, updated_at: '' },
  { id: 't-nr07', code: 'NR-07', description: 'PCMSO',                                        value: 220, is_combo: false, combo_items: null, excludes: null, order_index: 14, is_active: true, updated_at: '' },
  { id: 't-nr09', code: 'NR-09', description: 'Avaliação de Riscos Ambientais',    value: 240, is_combo: false, combo_items: null, excludes: null, order_index: 15, is_active: true, updated_at: '' },
  { id: 't-nr10', code: 'NR-10', description: 'Eletricidade Básica',                    value: 800, is_combo: false, combo_items: null, excludes: null, order_index: 16, is_active: true, updated_at: '' },
  { id: 't-nr10s',code: 'NR-10SEP',description: 'Eletricidade SEP',                           value: 1200,is_combo: false, combo_items: null, excludes: null, order_index: 17, is_active: true, updated_at: '' },
  { id: 't-nr11', code: 'NR-11', description: 'Movimentação de Materiais',         value: 280, is_combo: false, combo_items: null, excludes: null, order_index: 18, is_active: true, updated_at: '' },
  { id: 't-nr12', code: 'NR-12', description: 'Máquinas e Equipamentos',                value: 320, is_combo: false, combo_items: null, excludes: null, order_index: 19, is_active: true, updated_at: '' },
  { id: 't-nr13', code: 'NR-13', description: 'Caldeiras e Vasos de Pressão',           value: 600, is_combo: false, combo_items: null, excludes: null, order_index: 20, is_active: true, updated_at: '' },
  { id: 't-nr17', code: 'NR-17', description: 'Ergonomia',                                    value: 180, is_combo: false, combo_items: null, excludes: null, order_index: 21, is_active: true, updated_at: '' },
  { id: 't-nr18', code: 'NR-18', description: 'Construção Civil',                  value: 220, is_combo: false, combo_items: null, excludes: null, order_index: 22, is_active: true, updated_at: '' },
  { id: 't-nr20', code: 'NR-20', description: 'Inflamáveis e Combustíveis',        value: 380, is_combo: false, combo_items: null, excludes: null, order_index: 23, is_active: true, updated_at: '' },
  { id: 't-nr23', code: 'NR-23', description: 'Combate a Incêndio',                     value: 260, is_combo: false, combo_items: null, excludes: null, order_index: 24, is_active: true, updated_at: '' },
  { id: 't-nr33', code: 'NR-33', description: 'Espaços Confinados',                     value: 480, is_combo: false, combo_items: null, excludes: null, order_index: 25, is_active: true, updated_at: '' },
  { id: 't-nr35', code: 'NR-35', description: 'Trabalho em Altura',                          value: 180, is_combo: false, combo_items: null, excludes: null, order_index: 26, is_active: true, updated_at: '' },
];
