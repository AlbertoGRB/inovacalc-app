/**
 * @module sync
 * Motor de sincronização da fila de operações pendentes (outbox).
 *
 * Estratégia:
 * - Processa operações em série para preservar dependências
 *   (empresa deve ser criada antes do orçamento que a referencia).
 * - Erro de rede → marca como 'pending' e interrompe o flush.
 * - Erro do servidor (validação, conflito) → marca 'error' e continua.
 * - Ao confirmar um company.create, propaga o ID real nos quote.create dependentes.
 *
 * Rate limiting:
 * - Intervalo mínimo de FLUSH_MIN_INTERVAL_MS entre flushes (padrão: 5s).
 * - Flag `flushing` evita execuções simultâneas.
 */

import { supabase } from './supabase';
import { logger } from './logger';
import { useOutbox, type OutboxOp } from '@/stores/outboxStore';

const TAG = 'sync';

/** Intervalo mínimo entre flushes consecutivos (ms). Previne spam de requisições. */
const FLUSH_MIN_INTERVAL_MS = 5_000;

let flushing = false;
let lastFlushAt = 0;

// ─── Detecção de erro de rede ────────────────────────────────────────────────

export function isNetworkError(err: unknown): boolean {
  const msg = String((err as any)?.message ?? err ?? '').toLowerCase();
  return (
    msg.includes('network request failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('fetch') ||
    msg.includes('aborted') ||
    (err as any)?.code === 'ETIMEDOUT' ||
    (err as any)?.code === 'ENOTFOUND' ||
    (err as any)?.code === 'ECONNREFUSED'
  );
}

// ─── Processamento de operação individual ────────────────────────────────────

async function processOp(
  op: OutboxOp,
): Promise<{ ok: true; realId?: string } | { ok: false; network: boolean; error: string }> {
  try {
    logger.debug(TAG, `Processando op ${op.type} id=${op.id}`);

    switch (op.type) {
      case 'company.create': {
        const { data, error } = await supabase
          .from('companies')
          .insert(op.payload)
          .select('id')
          .single();
        if (error) throw error;
        logger.info(TAG, `company.create OK → realId=${data?.id}`);
        return { ok: true, realId: data?.id };
      }

      case 'company.update': {
        if (!op.recordId) throw new Error('recordId ausente em company.update');
        const { error } = await supabase
          .from('companies')
          .update(op.payload)
          .eq('id', op.recordId);
        if (error) throw error;
        logger.info(TAG, `company.update OK id=${op.recordId}`);
        return { ok: true };
      }

      case 'quote.create': {
        const { data, error } = await supabase
          .from('quotes')
          .insert(op.payload)
          .select('id')
          .single();
        if (error) throw error;
        logger.info(TAG, `quote.create OK → realId=${data?.id}`);
        return { ok: true, realId: data?.id };
      }

      default:
        return { ok: false, network: false, error: `Tipo de operação desconhecido: ${op.type}` };
    }
  } catch (e: unknown) {
    const isNet = isNetworkError(e);
    const message = (e as any)?.message ?? String(e);
    logger.warn(TAG, `Op ${op.type} falhou (network=${isNet}): ${message}`);
    return { ok: false, network: isNet, error: message };
  }
}

// ─── Flush da fila ───────────────────────────────────────────────────────────

/**
 * Tenta enviar todas as operações pendentes da outbox.
 * Idempotente — pode ser chamado a qualquer momento (mount, reconexão, manual).
 * Retorna estatísticas da execução.
 */
export async function flushOutbox(): Promise<{ sent: number; failed: number; pending: number }> {
  const now = Date.now();

  // Rate limit: evita flushes muito frequentes
  if (flushing || now - lastFlushAt < FLUSH_MIN_INTERVAL_MS) {
    const pending = useOutbox.getState().ops.length;
    return { sent: 0, failed: 0, pending };
  }

  flushing = true;
  lastFlushAt = now;

  let sent = 0;
  let failed = 0;

  logger.info(TAG, 'Iniciando flush da outbox...');

  try {
    while (true) {
      const ops = useOutbox.getState().ops;
      const op = ops.find((o) => o.status === 'pending' || o.status === 'error');
      if (!op) break;

      useOutbox.getState().markSyncing(op.id);
      const result = await processOp(op);

      if (result.ok) {
        // Propaga ID real para operações dependentes (ex.: quote.company_id)
        if (op.tempId && result.realId) {
          useOutbox.getState().replaceTempId(op.tempId, result.realId);
        }
        useOutbox.getState().remove(op.id);
        sent++;
      } else if (result.network) {
        // Sem conexão — volta para pending e interrompe
        useOutbox.setState((s) => ({
          ops: s.ops.map((o) =>
            o.id === op.id ? { ...o, status: 'pending', lastError: result.error } : o,
          ),
        }));
        logger.warn(TAG, 'Flush interrompido por erro de rede');
        break;
      } else {
        useOutbox.getState().markError(op.id, result.error);
        failed++;
        // Continua para a próxima op — esta precisará de intervenção manual
      }
    }
  } finally {
    flushing = false;
  }

  const pending = useOutbox.getState().ops.length;
  logger.info(TAG, `Flush concluído: sent=${sent} failed=${failed} pending=${pending}`);
  return { sent, failed, pending };
}

/** Retorna a quantidade de operações pendentes na outbox. */
export function pendingCount(): number {
  return useOutbox.getState().ops.length;
}
