/**
 * Sync engine — processa a fila do outbox.
 *
 * Estratégia:
 * - Roda em série (uma op por vez) para preservar dependências (empresa antes do orçamento).
 * - Se a op falha por erro de rede, marca como 'pending' e para o flush.
 * - Se falha por erro do servidor (validação, conflito), marca 'error' e segue.
 * - Quando uma company.create sobe com sucesso, substitui o tempId nos quote.create dependentes.
 */

import { supabase } from './supabase';
import { useOutbox, type OutboxOp } from '@/stores/outboxStore';

let flushing = false;

export function isNetworkError(err: any): boolean {
  const msg = String(err?.message || err || '').toLowerCase();
  return (
    msg.includes('network request failed') ||
    msg.includes('fetch') ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('aborted') ||
    err?.code === 'ETIMEDOUT' ||
    err?.code === 'ENOTFOUND' ||
    err?.code === 'ECONNREFUSED'
  );
}

async function processOp(op: OutboxOp): Promise<{ ok: true; realId?: string } | { ok: false; network: boolean; error: string }> {
  try {
    switch (op.type) {
      case 'company.create': {
        const { data, error } = await supabase
          .from('companies')
          .insert(op.payload)
          .select('id')
          .single();
        if (error) throw error;
        return { ok: true, realId: data?.id };
      }

      case 'company.update': {
        if (!op.recordId) throw new Error('recordId ausente em company.update');
        const { error } = await supabase
          .from('companies')
          .update(op.payload)
          .eq('id', op.recordId);
        if (error) throw error;
        return { ok: true };
      }

      case 'quote.create': {
        const { data, error } = await supabase
          .from('quotes')
          .insert(op.payload)
          .select('id')
          .single();
        if (error) throw error;
        return { ok: true, realId: data?.id };
      }

      default:
        return { ok: false, network: false, error: `Tipo desconhecido: ${op.type}` };
    }
  } catch (e: any) {
    return {
      ok: false,
      network: isNetworkError(e),
      error: e?.message ?? String(e),
    };
  }
}

/**
 * Tenta enviar todas as operações pendentes. Idempotente — pode ser chamado
 * a qualquer momento (mount, reconexão, manual). Se já está rodando, retorna.
 */
export async function flushOutbox(): Promise<{ sent: number; failed: number; pending: number }> {
  if (flushing) return { sent: 0, failed: 0, pending: 0 };
  flushing = true;

  let sent = 0;
  let failed = 0;
  try {
    while (true) {
      const ops = useOutbox.getState().ops;
      // pega a primeira pendente ou em erro (retry); ignora 'syncing' (não deve acontecer fora desse loop)
      const op = ops.find(o => o.status === 'pending' || o.status === 'error');
      if (!op) break;

      useOutbox.getState().markSyncing(op.id);
      const result = await processOp(op);

      if (result.ok) {
        // se gerou ID real e havia tempId, propaga em outras ops dependentes
        if (op.tempId && result.realId) {
          useOutbox.getState().replaceTempId(op.tempId, result.realId);
        }
        useOutbox.getState().remove(op.id);
        sent++;
      } else if (result.network) {
        // sem conexão — volta a marcar como pending e para
        useOutbox.getState().markError(op.id, 'Sem conexão. Tentando depois.');
        // reseta para pending pra próximo flush retentar limpo
        useOutbox.getState().ops.find(o => o.id === op.id) &&
          useOutbox.setState((s) => ({
            ops: s.ops.map(o => o.id === op.id ? { ...o, status: 'pending' } : o),
          }));
        break;
      } else {
        useOutbox.getState().markError(op.id, result.error);
        failed++;
        // segue pra próxima — esta vai precisar de intervenção
      }
    }
  } finally {
    flushing = false;
  }

  const pending = useOutbox.getState().ops.length;
  return { sent, failed, pending };
}

export function pendingCount(): number {
  return useOutbox.getState().ops.length;
}
