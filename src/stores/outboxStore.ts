/**
 * Outbox store — fila persistida de operações pendentes de sincronização.
 *
 * Toda mutação que muda dados do servidor (criar empresa, criar orçamento)
 * passa por aqui. Se houver internet, tentamos enviar na hora; senão fica
 * na fila e é processada quando voltar a conexão.
 *
 * Estado é persistido em AsyncStorage via middleware persist do Zustand.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type OutboxOpType =
  | 'company.create'
  | 'company.update'
  | 'quote.create';

export type OutboxStatus = 'pending' | 'syncing' | 'error';

export interface OutboxOp {
  id: string;                // UUID local da operação
  type: OutboxOpType;
  /** ID temporário criado offline (companies/quotes). Substituído pelo real após sync. */
  tempId?: string;
  /** Para updates: ID real do registro. */
  recordId?: string;
  payload: Record<string, any>;
  status: OutboxStatus;
  attempts: number;
  lastError?: string;
  createdAt: string;
}

interface OutboxState {
  ops: OutboxOp[];
  enqueue: (op: Omit<OutboxOp, 'id' | 'status' | 'attempts' | 'createdAt'>) => OutboxOp;
  markSyncing: (id: string) => void;
  markError: (id: string, message: string) => void;
  remove: (id: string) => void;
  /** Atualiza o tempId em payloads dependentes (ex.: quote.company_id) com o realId. */
  replaceTempId: (tempId: string, realId: string) => void;
  clear: () => void;
}

function uuid() {
  // RFC4122 v4 simplificado — suficiente como ID local
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const useOutbox = create<OutboxState>()(
  persist(
    (set) => ({
      ops: [],

      enqueue: (op) => {
        const full: OutboxOp = {
          ...op,
          id: uuid(),
          status: 'pending',
          attempts: 0,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ ops: [...s.ops, full] }));
        return full;
      },

      markSyncing: (id) =>
        set((s) => ({
          ops: s.ops.map(o => o.id === id ? { ...o, status: 'syncing', attempts: o.attempts + 1 } : o),
        })),

      markError: (id, message) =>
        set((s) => ({
          ops: s.ops.map(o => o.id === id ? { ...o, status: 'error', lastError: message } : o),
        })),

      remove: (id) =>
        set((s) => ({ ops: s.ops.filter(o => o.id !== id) })),

      replaceTempId: (tempId, realId) =>
        set((s) => ({
          ops: s.ops.map(o => {
            // substitui em payload.company_id (caso de quote.create dependente)
            if (o.payload?.company_id === tempId) {
              return { ...o, payload: { ...o.payload, company_id: realId } };
            }
            return o;
          }),
        })),

      clear: () => set({ ops: [] }),
    }),
    {
      name: 'outbox-v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export { uuid as makeLocalId };
