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
 * - Após cada quote.create bem-sucedido, invalida o cache ['quotes'] via queryClient.
 *
 * Rate limiting:
 * - Intervalo mínimo de FLUSH_MIN_INTERVAL_MS entre flushes (padrão: 5s).
 * - Flag `flushing` evita execuções simultâneas.
 */

import { supabase } from './supabase';
import { logger } from './logger';
import { queryClient } from './queryClient';
import { useOutbox, type OutboxOp } from '@/stores/outboxStore';

const TAG = 'sync';

const FLUSH_MIN_INTERVAL_MS = 5_000;

let flushing   = false;
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

// ─── Geração de número de orçamento ─────────────────────────────────────────

async function generateQuoteNumber(): Promise<string> {
  const now = new Date();
  const yyyymmdd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const prefix = `ORÇ-${yyyymmdd}-`;
  const { count } = await supabase
    .from('quotes')
    .select('id', { count: 'exact', head: true })
    .like('quote_number', `${prefix}%`);
  return `${prefix}${String((count ?? 0) + 1).padStart(4, '0')}`;
}

// ─── Processamento de operação individual ────────────────────────────────────

async function processOp(
  op: OutboxOp,
): Promise<{ ok: true; realId?: string } | { ok: false; network: boolean; error: string }> {
  try {
    logger.debug(TAG, `Processando op ${op.type} id=${op.id}`);

    switch (op.type) {

      // ── Empresa: criar ───────────────────────────────────────────────────
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

      // ── Empresa: atualizar ───────────────────────────────────────────────
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

      // ── Orçamento: criar (payload completo com detalhes aninhados) ────────
      case 'quote.create': {
        // Suporta tanto o formato legado (payload flat) quanto o novo (nested)
        const isNewFormat = typeof op.payload.quote === 'object' && op.payload.quote !== null;

        if (!isNewFormat) {
          // Legado: apenas inserção da linha principal
          const { data, error } = await supabase
            .from('quotes')
            .insert(op.payload)
            .select('id')
            .single();
          if (error) throw error;
          logger.info(TAG, `quote.create (legado) OK → realId=${data?.id}`);
          return { ok: true, realId: data?.id };
        }

        const { quote: quotePayload, planDetails, trainingDetails } = op.payload as {
          quote:            Record<string, any>;
          planDetails:      Record<string, any> | null;
          trainingDetails:  (Record<string, any> & { items: any[] }) | null;
        };

        // 1) Gera número real (agora online)
        const realQuoteNumber = await generateQuoteNumber();

        // 2) Insere na tabela quotes com número real
        const { data: quote, error: quoteErr } = await supabase
          .from('quotes')
          .insert({ ...quotePayload, quote_number: realQuoteNumber })
          .select('id')
          .single();
        if (quoteErr) throw quoteErr;

        // 3) Detalhes do plano
        if (planDetails) {
          const { error } = await supabase
            .from('plan_quote_details')
            .insert({ ...planDetails, quote_id: quote.id });
          if (error) logger.warn(TAG, `plan_quote_details: ${error.message}`);
        }

        // 4) Detalhes + itens de treinamento
        if (trainingDetails) {
          const { items, ...detailFields } = trainingDetails;
          const { data: tDetail, error: tErr } = await supabase
            .from('training_quote_details')
            .insert({ ...detailFields, quote_id: quote.id })
            .select('id')
            .single();

          if (tErr) {
            logger.warn(TAG, `training_quote_details: ${tErr.message}`);
          } else if (items && items.length > 0) {
            const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            const itemsToInsert = items
              .filter((it: any) => uuidRe.test(it.trainingId))
              .map((it: any) => ({
                training_quote_detail_id: tDetail.id,
                training_id:              it.trainingId,
                quantity:                 it.quantity,
                unit_value:               it.unitValue,
                total_value:              it.totalValue,
              }));
            if (itemsToInsert.length > 0) {
              const { error } = await supabase.from('training_quote_items').insert(itemsToInsert);
              if (error) logger.warn(TAG, `training_quote_items: ${error.message}`);
            }
          }
        }

        // 5) Invalida o cache de orçamentos → lista mostra dado real do banco
        queryClient.invalidateQueries({ queryKey: ['quotes'] });

        logger.info(TAG, `quote.create OK → realId=${quote.id} number=${realQuoteNumber}`);
        return { ok: true, realId: quote.id };
      }

      default:
        return { ok: false, network: false, error: `Tipo de operação desconhecido: ${(op as any).type}` };
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
 * Idempotente — pode ser chamado a qualquer momento.
 */
export async function flushOutbox(): Promise<{ sent: number; failed: number; pending: number }> {
  const now = Date.now();

  if (flushing || now - lastFlushAt < FLUSH_MIN_INTERVAL_MS) {
    return { sent: 0, failed: 0, pending: useOutbox.getState().ops.length };
  }

  flushing    = true;
  lastFlushAt = now;

  let sent   = 0;
  let failed = 0;

  logger.info(TAG, 'Iniciando flush da outbox...');

  try {
    while (true) {
      const op = useOutbox.getState().ops.find(o => o.status === 'pending' || o.status === 'error');
      if (!op) break;

      useOutbox.getState().markSyncing(op.id);
      const result = await processOp(op);

      if (result.ok) {
        if (op.tempId && result.realId) {
          useOutbox.getState().replaceTempId(op.tempId, result.realId);
        }
        useOutbox.getState().remove(op.id);
        sent++;
      } else if (result.network) {
        useOutbox.setState(s => ({
          ops: s.ops.map(o => o.id === op.id ? { ...o, status: 'pending', lastError: result.error } : o),
        }));
        logger.warn(TAG, 'Flush interrompido por erro de rede');
        break;
      } else {
        useOutbox.getState().markError(op.id, result.error);
        failed++;
      }
    }
  } finally {
    flushing = false;
  }

  const pending = useOutbox.getState().ops.length;
  logger.info(TAG, `Flush concluído: sent=${sent} failed=${failed} pending=${pending}`);
  return { sent, failed, pending };
}

export function pendingCount(): number {
  return useOutbox.getState().ops.length;
}
