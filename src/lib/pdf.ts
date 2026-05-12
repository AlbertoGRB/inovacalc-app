import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Quote } from '@/types/database';

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  SENT: 'Enviado',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  EXPIRED: 'Expirado',
};

const TYPE_LABELS: Record<string, string> = {
  PLAN: 'Plano de SST',
  TRAINING: 'Treinamentos',
  BOTH: 'Plano + Treinamentos',
};

function buildHtml(q: Quote): string {
  const company = q.companies?.company_name ?? '—';
  const cnpj = q.companies?.cnpj ?? '';
  const status = STATUS_LABELS[q.status] ?? q.status;
  const type = TYPE_LABELS[q.type] ?? q.type;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>Orçamento ${q.quote_number}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif;
    color: #1A1A1A;
    margin: 0;
    padding: 40px;
    font-size: 12px;
    line-height: 1.5;
  }
  .header {
    border-bottom: 2px solid #042C53;
    padding-bottom: 16px;
    margin-bottom: 28px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .brand {
    font-size: 22px;
    font-weight: 600;
    color: #042C53;
    letter-spacing: -0.5px;
  }
  .brand small { display: block; font-size: 11px; color: #888780; font-weight: 400; letter-spacing: 0.4px; }
  .doc-meta { text-align: right; font-size: 11px; color: #444441; }
  .doc-meta b { color: #1A1A1A; font-size: 13px; }
  .label {
    text-transform: uppercase;
    font-size: 9px;
    letter-spacing: 0.8px;
    color: #888780;
    margin: 24px 0 8px;
    font-weight: 500;
  }
  .card {
    border: 1px solid #E5E5E5;
    border-radius: 8px;
    padding: 14px 16px;
    margin-bottom: 8px;
  }
  .card.dark {
    background: #042C53;
    color: #fff;
    border: none;
    padding: 22px 20px;
  }
  .card.dark .big {
    font-size: 32px;
    font-weight: 600;
    letter-spacing: -1px;
    margin-top: 6px;
  }
  .card.dark .sub { color: rgba(255,255,255,0.7); font-size: 12px; }
  .card.dark .badge {
    display: inline-block;
    background: rgba(255,255,255,0.15);
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 10px;
    letter-spacing: 0.4px;
  }
  table { width: 100%; border-collapse: collapse; }
  table th, table td {
    text-align: left;
    padding: 10px 14px;
    border-bottom: 0.5px solid #E5E5E5;
    font-size: 12px;
  }
  table th {
    background: #F8F9FA;
    font-weight: 500;
    color: #444441;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }
  table td.value { text-align: right; font-weight: 500; }
  .row-flex { display: flex; justify-content: space-between; }
  .footer {
    margin-top: 36px;
    padding-top: 14px;
    border-top: 0.5px solid #E5E5E5;
    font-size: 10px;
    color: #888780;
    text-align: center;
  }
  .notes {
    background: #F8F9FA;
    padding: 12px 14px;
    border-radius: 8px;
    color: #444441;
  }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">
      Inovassie
      <small>SEGURANÇA E SAÚDE DO TRABALHO</small>
    </div>
    <div class="doc-meta">
      <b>Orçamento ${q.quote_number}</b><br>
      Emitido em ${formatDate(q.created_at)}<br>
      Válido até ${formatDate(q.valid_until)}
    </div>
  </div>

  <div class="card dark">
    <div class="row-flex">
      <span style="font-size:11px;color:rgba(255,255,255,0.6);">Total anual</span>
      <span class="badge">${status.toUpperCase()}</span>
    </div>
    <div class="big">${formatBRL(q.total_value)}</div>
    <div class="sub">ou ${formatBRL(q.monthly_value)} / mês</div>
  </div>

  <div class="label">Cliente</div>
  <div class="card">
    <div class="row-flex">
      <div>
        <b>${company}</b><br>
        <span style="color:#888780;font-size:11px;">${cnpj || 'Sem CNPJ'}</span>
      </div>
    </div>
  </div>

  <div class="label">Composição do orçamento</div>
  <table>
    <thead>
      <tr><th>Item</th><th style="text-align:right;">Valor</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>${type}</td>
        <td class="value">${formatBRL(q.total_value)}</td>
      </tr>
      <tr style="background:#F8F9FA;">
        <td><b>Total geral</b></td>
        <td class="value"><b>${formatBRL(q.total_value)}</b></td>
      </tr>
    </tbody>
  </table>

  ${q.notes ? `
    <div class="label">Observações</div>
    <div class="notes">${escapeHtml(q.notes)}</div>
  ` : ''}

  <div class="footer">
    Documento gerado eletronicamente pela InovaCalc · Inovassie<br>
    Este orçamento é válido até ${formatDate(q.valid_until)}.
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Gera e compartilha o PDF do orçamento. Retorna o URI do arquivo gerado. */
export async function shareQuotePdf(quote: Quote): Promise<string> {
  const html = buildHtml(quote);
  const { uri } = await Print.printToFileAsync({ html, base64: false });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Orçamento ${quote.quote_number}`,
      UTI: 'com.adobe.pdf',
    });
  }
  return uri;
}
