import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

// ─── Constantes de plano (inline — não existem no constants mobile) ───────────

const PLAN_LABELS: Record<string, string> = {
  ESSENCIAL: 'Plano Essencial',
  INTEGRAL:  'Plano Integral',
  AVANCADO:  'Plano Avançado',
}

const CIPA_RULES: Record<number, number> = { 1: 81, 2: 51, 3: 20, 4: 20 }

// ─── Paleta ───────────────────────────────────────────────────────────────────

const C = {
  teal:       '#16B5B5',
  tealLight:  '#D6F2F2',
  tealMid:    '#A7E2E2',
  navy:       '#1A3A5C',
  navyDark:   '#152B49',
  darkBlue:   '#1A3A5C',
  white:      '#FFFFFF',
  darkGray:   '#1F2937',
  medGray:    '#475569',
  lightGray:  '#94A3B8',
  bgLight:    '#F8FAFC',
  bgInfo:     '#E0F2FE',
  border:     '#E5E7EB',
  borderMid:  '#D1D5DB',
  amber:      '#F59E0B',
  amberBg:    '#FFFBEB',
  amberText:  '#78350F',
  success:    '#10B981',
  successBg:  '#D1FAE5',
  successText:'#065F46',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number): string {
  return (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(s: string): string {
  if (!s) return '—'
  try {
    const d = s.includes('T') ? new Date(s) : new Date(s + 'T12:00:00')
    return d.toLocaleDateString('pt-BR')
  } catch { return s }
}

function esc(s: string | null | undefined): string {
  return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function getTitle(type: string, planType?: string): string {
  const planLabel = planType ? (PLAN_LABELS[planType] ?? planType) : 'Plano SST'
  if (type === 'PLAN')     return `PROPOSTA COMERCIAL — ${planLabel}`
  if (type === 'TRAINING') return 'PROPOSTA COMERCIAL — Treinamentos NR'
  return `PROPOSTA COMERCIAL — ${planLabel} + Treinamentos`
}

function getTypeLabel(type: string): string {
  if (type === 'PLAN')     return 'Plano SST'
  if (type === 'TRAINING') return 'Treinamentos NR'
  return 'Plano + Treinamentos'
}

function buildIncludedServices(planType: string, employees: number, riskGrade: number): string[] {
  const services = [
    'Gestão básica de documentos de SST',
    'Orientações técnicas e suporte',
    'Treinamentos conforme necessidade',
    'Emissão de registros e certificados',
  ]
  const cipaThreshold = CIPA_RULES[riskGrade] ?? 999
  const hasCipa = planType === 'AVANCADO' && employees >= cipaThreshold
  return hasCipa ? [...services, 'CIPA (neste porte: incluída)'] : services
}

async function assetToDataUri(moduleId: number): Promise<string | null> {
  try {
    const asset = Asset.fromModule(moduleId)
    await asset.downloadAsync()
    const uri = asset.localUri ?? asset.uri
    if (!uri) return null
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    })
    return `data:image/png;base64,${base64}`
  } catch {
    return null
  }
}

// ─── Geração do HTML ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildHtml(q: any, letterheadDataUri?: string | null): string {
  const company      = q.companies ?? {}
  const planDetail   = q.plan_quote_details?.[0] ?? null
  const trainDetail  = q.training_quote_details?.[0] ?? null

  const hasPlan      = !!planDetail
  const hasTrainings = !!trainDetail

  const qtype = q.type as string | undefined
  const includesPlan      = qtype === 'PLAN'     || qtype === 'BOTH'
  const includesTrainings = qtype === 'TRAINING' || qtype === 'BOTH'

  const planType: string | undefined = planDetail?.selected_plan ?? (includesPlan ? 'ESSENCIAL' : undefined)

  const trainingItems: any[] = (trainDetail?.training_quote_items ?? []).filter((i: any) => i.quantity > 0)
  const needsPage2   = trainingItems.length > 5

  const includedServices = planType
    ? buildIncludedServices(planType, planDetail?.total_employees ?? 0, planDetail?.risk_grade ?? 1)
    : []

  // Extrai valor do plano: tenta pelo selected_plan, depois qualquer valor não-zero
  let planFinal = 0
  if (hasPlan) {
    if (planType === 'ESSENCIAL')    planFinal = Number(planDetail?.essencial_final_value) || 0
    else if (planType === 'INTEGRAL') planFinal = Number(planDetail?.integral_final_value) || 0
    else if (planType === 'AVANCADO') planFinal = Number(planDetail?.advanced_final_value) || 0

    if (planFinal === 0) {
      planFinal = Number(planDetail?.essencial_final_value) ||
                  Number(planDetail?.integral_final_value) ||
                  Number(planDetail?.advanced_final_value) || 0
    }
  }

  let trainingFinal = hasTrainings ? (Number(trainDetail?.final_value) || 0) : 0

  // Deriva valores cruzados quando um lado falta mas o total existe
  const total = Number(q.total_value) || 0
  if (total > 0) {
    if (planFinal === 0 && trainingFinal > 0 && includesPlan) {
      planFinal = total - trainingFinal
    } else if (trainingFinal === 0 && planFinal > 0 && includesTrainings) {
      trainingFinal = total - planFinal
    }
  }

  const showPlan      = includesPlan
  const showTrainings = includesTrainings

  const discountPct   = trainDetail?.plan_discount ?? 0
  // ── Tabela de treinamentos (Página 2) ────────────────────────────────────
  const trainingTableRows = trainingItems.map((item: any, i: number) => {
    const bg = i % 2 === 0 ? C.white : '#F9FAFB'
    return `
      <tr style="background:${bg};">
        <td style="padding:5px 8px;font-size:8px;font-weight:700;border-bottom:1px solid #F3F4F6;">${esc(item.trainings?.code ?? '—')}</td>
        <td style="padding:5px 8px;font-size:8px;border-bottom:1px solid #F3F4F6;">${esc(item.trainings?.description ?? '—')}</td>
        <td style="padding:5px 8px;font-size:8px;text-align:center;border-bottom:1px solid #F3F4F6;">${item.quantity}</td>
        <td style="padding:5px 8px;font-size:8px;text-align:right;border-bottom:1px solid #F3F4F6;">${fmt(item.unit_value)}</td>
        <td style="padding:5px 8px;font-size:8px;font-weight:700;text-align:right;border-bottom:1px solid #F3F4F6;">${fmt(item.total_value)}</td>
      </tr>`
  }).join('')

  const subtotalTraining = trainDetail?.subtotal ?? 0

  const trainingTableSection = hasTrainings && needsPage2 ? `
    <p style="font-size:7px;font-weight:700;color:${C.darkBlue};text-transform:uppercase;letter-spacing:1.2px;
       margin:0 0 8px 0;padding-bottom:4px;border-bottom:1.5px solid ${C.teal};">
      Detalhamento — Treinamentos NR
    </p>
    <table style="width:100%;border-collapse:collapse;border:1px solid ${C.border};border-radius:5px;overflow:hidden;margin-bottom:14px;">
      <thead>
        <tr style="background:${C.darkBlue};">
          <th style="padding:7px 8px;font-size:7px;color:${C.white};text-align:left;width:12%;">Código</th>
          <th style="padding:7px 8px;font-size:7px;color:${C.white};text-align:left;">Descrição</th>
          <th style="padding:7px 8px;font-size:7px;color:${C.white};text-align:center;width:8%;">Qtd</th>
          <th style="padding:7px 8px;font-size:7px;color:${C.white};text-align:right;width:18%;">Valor Unit.</th>
          <th style="padding:7px 8px;font-size:7px;color:${C.white};text-align:right;width:18%;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${trainingTableRows}
      </tbody>
      <tfoot>
        <tr style="background:${C.tealLight};">
          <td colspan="4" style="padding:7px 8px;font-size:7.5px;font-weight:700;">Subtotal</td>
          <td style="padding:7px 8px;font-size:7.5px;font-weight:700;text-align:right;">${fmt(subtotalTraining)}</td>
        </tr>
        ${discountPct > 0 ? `
        <tr style="background:#A7F3D0;">
          <td colspan="4" style="padding:7px 8px;font-size:7.5px;font-weight:700;color:${C.successText};">Desconto do plano (${discountPct}%)</td>
          <td style="padding:7px 8px;font-size:7.5px;font-weight:700;color:${C.successText};text-align:right;">- ${fmt(subtotalTraining * discountPct / 100)}</td>
        </tr>` : ''}
        <tr style="background:${C.darkBlue};">
          <td colspan="4" style="padding:7px 8px;font-size:7.5px;font-weight:700;color:${C.white};">Valor Final</td>
          <td style="padding:7px 8px;font-size:7.5px;font-weight:700;color:${C.white};text-align:right;">${fmt(trainingFinal)}</td>
        </tr>
      </tfoot>
    </table>` : ''

  const resumoInvestimentoSection = needsPage2 ? `
    <p style="font-size:7px;font-weight:700;color:${C.darkBlue};text-transform:uppercase;letter-spacing:1.2px;
       margin:14px 0 8px 0;padding-bottom:4px;border-bottom:1.5px solid ${C.teal};">
      Resumo do Investimento
    </p>
    <table style="width:100%;border-collapse:collapse;border:1px solid ${C.border};border-radius:5px;overflow:hidden;">
      <thead>
        <tr style="background:${C.teal};">
          <th style="padding:7px 8px;font-size:7px;color:${C.white};text-align:left;">Item</th>
          <th style="padding:7px 8px;font-size:7px;color:${C.white};text-align:right;width:28%;">Valor Anual</th>
          <th style="padding:7px 8px;font-size:7px;color:${C.white};text-align:right;width:28%;">Valor Mensal</th>
        </tr>
      </thead>
      <tbody>
        ${hasPlan ? `
        <tr style="background:${C.white};">
          <td style="padding:6px 8px;font-size:7.5px;">${esc(planType ? (PLAN_LABELS[planType] ?? planType) : 'Plano SST')}</td>
          <td style="padding:6px 8px;font-size:7.5px;text-align:right;">${fmt(planFinal)}</td>
          <td style="padding:6px 8px;font-size:7.5px;text-align:right;">${fmt(planFinal / 12)}</td>
        </tr>` : ''}
        ${hasTrainings ? `
        <tr style="background:#F9FAFB;">
          <td style="padding:6px 8px;font-size:7.5px;">Treinamentos NR (${trainingItems.length} item${trainingItems.length !== 1 ? 's' : ''})</td>
          <td style="padding:6px 8px;font-size:7.5px;text-align:right;">${fmt(trainingFinal)}</td>
          <td style="padding:6px 8px;font-size:7.5px;text-align:right;">${fmt(trainingFinal / 12)}</td>
        </tr>` : ''}
      </tbody>
      <tfoot>
        <tr style="background:${C.darkBlue};">
          <td style="padding:7px 8px;font-size:7.5px;font-weight:700;color:${C.white};">Total Geral</td>
          <td style="padding:7px 8px;font-size:7.5px;font-weight:700;color:${C.white};text-align:right;">${fmt(q.total_value)}</td>
          <td style="padding:7px 8px;font-size:7.5px;font-weight:700;color:${C.white};text-align:right;">${fmt(q.monthly_value)}</td>
        </tr>
      </tfoot>
    </table>` : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Orçamento ${esc(q.quote_number)}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    color: ${C.darkGray};
    background: ${C.white};
    font-size: 9px;
    line-height: 1.5;
  }
  .page {
    width: 210mm;
    min-height: 297mm;
    position: relative;
    overflow: hidden;
    background: ${C.white};
  }
  .page::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image: ${letterheadDataUri ? `url("${letterheadDataUri}")` : 'none'};
    background-size: 100% 100%;
    background-repeat: no-repeat;
    z-index: 0;
  }
  .page-break { page-break-before: always; }

  /* ── Marca d'água ── */
  .watermark {
    position: fixed;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    font-size: 220px;
    font-weight: 900;
    color: ${C.teal};
    opacity: ${letterheadDataUri ? '0' : '0.06'};
    z-index: 0;
    pointer-events: none;
    user-select: none;
  }

  /* ── Cabeçalho ── */
  .header {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    height: 30mm;
    background: ${letterheadDataUri ? 'transparent' : C.teal};
    z-index: 2;
  }
  .header-logo {
    display: ${letterheadDataUri ? 'none' : 'block'};
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    font-size: 22px;
    font-weight: 700;
    color: ${C.white};
    letter-spacing: -0.3px;
  }
  .header-logo span {
    display: block;
    font-size: 8px;
    font-weight: 400;
    letter-spacing: 1px;
    text-transform: uppercase;
    opacity: 0.85;
    margin-top: 2px;
  }
  .header-badge {
    position: absolute;
    top: 10.5mm;
    right: 12mm;
    background: ${C.darkBlue};
    padding: 3.2mm 5.2mm;
    border-radius: 7mm;
    border: 0.35mm solid rgba(255,255,255,0.95);
    text-align: center;
    min-width: 38mm;
  }
  .badge-value {
    font-size: 11px;
    font-weight: 700;
    color: ${C.white};
    letter-spacing: 0.5px;
  }

  /* ── Corpo ── */
  .body { padding: 33.5mm 12.5mm 0; position: relative; z-index: 1; }

  /* ── Título ── */
  .title {
    font-size: 20px;
    font-weight: 700;
    color: ${C.darkBlue};
    margin-bottom: 13px;
    letter-spacing: 0;
    text-transform: uppercase;
  }
  .title-rule {
    height: 1.5px;
    background: ${C.teal};
    margin-bottom: 23px;
  }

  /* ── 3 caixas de info ── */
  .info-row { display: flex; gap: 13mm; margin-bottom: 18mm; }
  .info-box {
    flex: 1;
    background: ${C.white};
    border-radius: 6px;
    padding: 3.5mm 4mm;
    border: 1px solid ${C.tealMid};
    display: flex;
    align-items: center;
    gap: 4mm;
    min-height: 16mm;
  }
  .info-icon-box {
    width: 10mm; height: 10mm; min-width: 10mm;
    border-radius: 4px;
    background: ${C.white};
    border: 1px solid ${C.tealMid};
    display: flex; align-items: center; justify-content: center;
    font-size: 17px;
  }
  .info-text { flex: 1; }
  .info-label {
    font-size: 9px;
    font-weight: 700;
    color: ${C.darkBlue};
    margin-bottom: 1px;
  }
  .info-value { font-size: 11px; font-weight: 700; color: ${C.darkBlue}; }

  /* ── Dados do cliente ── */
  .client-row { display: flex; gap: 7mm; margin-bottom: 12mm; }
  .client-left { flex: 1.78; }
  .client-grid { display: flex; flex-wrap: wrap; }
  .client-cell {
    width: 50%;
    display: flex;
    align-items: flex-start;
    gap: 3mm;
    margin-bottom: 7mm;
    padding-right: 4px;
  }
  .client-cell-icon { font-size: 18px; color: ${C.teal}; margin-top: 1px; min-width: 18px; }
  .client-cell-text { flex: 1; }
  .field-label {
    font-size: 8.5px;
    font-weight: 700;
    color: ${C.darkBlue};
    margin-bottom: 1px;
  }
  .field-value { font-size: 9.2px; font-weight: 700; color: ${C.darkGray}; }
  .field-value-soft { font-size: 9.2px; color: ${C.darkGray}; font-weight: 700; }
  /* Serviços inclusos box */
  .services-box {
    flex: 1;
    background: ${C.tealLight};
    border-radius: 8px;
    padding: 6mm;
    border: 1px solid #98A8B3;
    min-height: 42mm;
  }
  .services-head {
    display: flex;
    align-items: center;
    gap: 4mm;
    margin-bottom: 6mm;
  }
  .services-title {
    font-size: 11px;
    font-weight: 700;
    color: ${C.darkBlue};
    letter-spacing: 0.4px;
  }
  .check-item { display: flex; align-items: flex-start; margin-bottom: 5mm; gap: 4mm; }
  .check-bullet {
    width: 12px; height: 12px; min-width: 12px;
    border-radius: 50%;
    background: ${C.teal};
    color: ${C.white};
    font-size: 8px;
    font-weight: 700;
    display: flex; align-items: center; justify-content: center;
    line-height: 1;
    margin-top: 1px;
  }
  .check-text { font-size: 8.5px; color: ${C.darkGray}; flex: 1; line-height: 1.2; }

  /* ── Seção divider ── */
  .section-head {
    display: flex;
    align-items: center;
    gap: 3mm;
    margin-bottom: 7mm;
  }
  .section-icon {
    width: 8mm; height: 8mm; min-width: 8mm;
    border-radius: 50%;
    background: ${C.teal};
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; color: ${C.white};
  }
  .section-title {
    font-size: 11px;
    font-weight: 700;
    color: ${C.darkBlue};
    letter-spacing: 0.6px;
  }
  .section-rule {
    flex: 1;
    height: 1.5px;
    background: ${C.teal};
    margin-left: 4px;
  }

  /* ── Tabela de investimento horizontal ── */
  .invest-table {
    width: 100%;
    border-collapse: collapse;
    border: 1.2px solid #0F172A;
    border-radius: 6px;
    overflow: hidden;
    margin-bottom: 0;
  }
  .invest-table th {
    background: ${C.darkBlue};
    color: ${C.white};
    font-size: 11px;
    font-weight: 700;
    padding: 12px 6px;
    text-align: center;
    letter-spacing: 0.3px;
    border-right: 1.2px solid #0F172A;
  }
  .invest-table th:last-child { border-right: none; background: ${C.darkBlue}; }
  .invest-table td {
    padding: 18px 8px;
    text-align: center;
    border-right: 1.2px solid #0F172A;
    vertical-align: middle;
  }
  .invest-table td:last-child {
    background: ${C.darkBlue};
    border-right: none;
    padding: 10px 12px;
  }
  .invest-val {
    font-size: 12px;
    font-weight: 700;
    color: ${C.teal};
    display: block;
    margin-bottom: 2px;
  }
  .invest-sub { font-size: 9px; color: ${C.darkBlue}; font-weight: 700; }
  .invest-total {
    font-size: 12px;
    font-weight: 700;
    color: ${C.darkBlue};
    display: block;
    margin-bottom: 2px;
  }
  .monthly-label { font-size: 11px; font-weight: 700; color: ${C.white}; text-align: center; margin-bottom: 9px; letter-spacing: 0.2px; }
  .monthly-rule { width: 36mm; height: 1.2px; background: rgba(255,255,255,0.8); margin: 0 auto 10px; }
  .monthly-value { font-size: 22px; font-weight: 700; color: ${C.white}; text-align: center; }
  .monthly-unit { display:none; }

  /* ── Desconto ── */
  .discount-bar {
    background: ${C.successBg};
    border-radius: 5px;
    padding: 9px;
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }
  .discount-badge {
    background: ${C.success};
    border-radius: 3px;
    padding: 3px 6px;
    font-size: 7px;
    color: ${C.white};
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
  }
  .discount-text { font-size: 8px; color: ${C.successText}; flex: 1; }

  /* ── Condições ── */
  .cond-row {
    display: flex;
    gap: 13mm;
    margin-bottom: 20mm;
  }
  .cond-item { flex: 1; display: flex; align-items: center; gap: 7px; }
  .cond-icon-box {
    width: 12mm; height: 12mm; min-width: 12mm;
    border-radius: 0;
    background: transparent;
    border: none;
    display: flex; align-items: center; justify-content: center;
    font-size: 22px; color: ${C.teal};
  }
  .cond-text { flex: 1; }
  .cond-label { font-size: 8.5px; font-weight: 700; color: ${C.darkBlue}; margin-bottom: 2px; }
  .cond-value { font-size: 9px; color: ${C.darkGray}; }

  /* ── Observações ── */
  .notes-box {
    background: ${C.amberBg};
    border-radius: 5px;
    padding: 10px;
    border-left: 3px solid ${C.amber};
    margin-bottom: 14px;
  }
  .notes-label { font-size: 6.5px; color: ${C.amber}; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; margin-bottom: 3px; }
  .notes-text { font-size: 8px; color: ${C.amberText}; }

  /* ── Assinaturas ── */
  .sig-row {
    position: absolute;
    left: 20mm;
    right: 20mm;
    bottom: 18mm;
    display: flex;
    gap: 35mm;
  }
  .sig-block { flex: 1; text-align: center; }
  .sig-line { border-top: 1.2px solid ${C.darkBlue}; margin-bottom: 6px; }
  .sig-name { font-size: 8px; color: ${C.darkBlue}; font-weight: 700; }
  .sig-role { display: none; }

  /* ── Rodapé ── */
  .footer {
    position: fixed;
    bottom: 16px;
    left: 36px;
    right: 36px;
    border-top: 0.5px solid ${C.border};
    padding-top: 6px;
    display: none;
    justify-content: space-between;
    font-size: 6.5px;
    color: ${C.lightGray};
  }
</style>
</head>
<body>

<!-- Marca d'água -->
<div class="watermark">d+</div>

<!-- ══════ PÁGINA 1 ══════ -->
<div class="page">

  <!-- 1. Cabeçalho -->
  <div class="header">
    <div class="header-logo">
      Clínica Inovassie
      <span>Saúde e Segurança do Trabalho</span>
    </div>
    <div class="header-badge">
      <div class="badge-value">${esc(q.quote_number)}</div>
    </div>
  </div>

  <div class="body">

    <!-- 2. Título dinâmico -->
    <div class="title">${getTitle(q.type, planType)}</div>
    <div class="title-rule"></div>

    <!-- 3. Caixas de informação -->
    <div class="info-row">
      <div class="info-box">
        <div class="info-icon-box">📅</div>
        <div class="info-text">
          <div class="info-label">Data de emissão</div>
          <div class="info-value">${fmtDate(q.created_at)}</div>
        </div>
      </div>
      <div class="info-box">
        <div class="info-icon-box">📅</div>
        <div class="info-text">
          <div class="info-label">Válida até</div>
          <div class="info-value">${fmtDate(q.valid_until)}</div>
        </div>
      </div>
      <div class="info-box">
        <div class="info-icon-box">📄</div>
        <div class="info-text">
          <div class="info-label">Tipo</div>
          <div class="info-value">${getTypeLabel(q.type)}</div>
        </div>
      </div>
    </div>

    <!-- 4. Dados do cliente -->
    <div class="section-head">
      <div class="section-icon">◉</div>
      <span class="section-title">DADOS DO CLIENTE</span>
      <div class="section-rule"></div>
    </div>
    <div class="client-row">
      <!-- Campos em grid 2x4 -->
      <div class="client-left">
        <div class="client-grid">
          <div class="client-cell">
            <span class="client-cell-icon">🏢</span>
            <div class="client-cell-text">
              <div class="field-label">Razão social</div>
              <div class="${company.company_name ? 'field-value' : 'field-value-soft'}">${esc(company.company_name || 'A preencher')}</div>
            </div>
          </div>
          <div class="client-cell">
            <span class="client-cell-icon">💼</span>
            <div class="client-cell-text">
              <div class="field-label">Cargo</div>
              <div class="${company.contact_role ? 'field-value' : 'field-value-soft'}">${esc(company.contact_role || 'A preencher')}</div>
            </div>
          </div>
          <div class="client-cell">
            <span class="client-cell-icon">🪪</span>
            <div class="client-cell-text">
              <div class="field-label">${(company.cnpj ?? '').startsWith('TEMP-') ? 'Identificação provisória' : 'CNPJ'}</div>
              <div class="${company.cnpj ? 'field-value' : 'field-value-soft'}">${esc(company.cnpj || 'A preencher')}</div>
            </div>
          </div>
          <div class="client-cell">
            <span class="client-cell-icon">📞</span>
            <div class="client-cell-text">
              <div class="field-label">Telefone</div>
              <div class="${company.phone ? 'field-value' : 'field-value-soft'}">${esc(company.phone || 'A preencher')}</div>
            </div>
          </div>
          <div class="client-cell">
            <span class="client-cell-icon">🛡</span>
            <div class="client-cell-text">
              <div class="field-label">Grau de risco</div>
              <div class="${company.risk_grade ? 'field-value' : 'field-value-soft'}">${company.risk_grade ? `Grau ${company.risk_grade}` : 'A preencher'}</div>
            </div>
          </div>
          <div class="client-cell">
            <span class="client-cell-icon">✉</span>
            <div class="client-cell-text">
              <div class="field-label">E-mail</div>
              <div class="${company.email ? 'field-value' : 'field-value-soft'}">${esc(company.email || 'A preencher')}</div>
            </div>
          </div>
          <div class="client-cell">
            <span class="client-cell-icon">👤</span>
            <div class="client-cell-text">
              <div class="field-label">Responsável</div>
              <div class="${company.contact_name ? 'field-value' : 'field-value-soft'}">${esc(company.contact_name || 'A preencher')}</div>
            </div>
          </div>
          <div class="client-cell">
            <span class="client-cell-icon">📍</span>
            <div class="client-cell-text">
              <div class="field-label">Cidade / Estado</div>
              <div class="${(company.city && company.state) ? 'field-value' : 'field-value-soft'}">${company.city && company.state ? `${esc(company.city)} / ${esc(company.state)}` : 'A preencher'}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Serviços inclusos box -->
      <div class="services-box">
        <div class="services-head">
          <div class="check-bullet" style="width:14px;height:14px;font-size:9px;">✓</div>
          <span class="services-title">SERVIÇOS INCLUSOS</span>
        </div>
        ${showPlan && planType
          ? includedServices.map(s => `
              <div class="check-item">
                <div class="check-bullet">✓</div>
                <span class="check-text">${esc(s)}</span>
              </div>`).join('')
          : showTrainings && trainingItems.length > 0
            ? trainingItems.slice(0, 5).map((it: any) => `
              <div class="check-item">
                <div class="check-bullet">✓</div>
                <span class="check-text">${esc(it.trainings?.code ?? 'NR')} — ${esc(it.trainings?.description ?? 'Treinamento')} (${it.quantity}x)</span>
              </div>`).join('') +
              (trainingItems.length > 5 ? `<div style="font-size:7.5px;color:${C.medGray};margin-left:17px;">+ ${trainingItems.length - 5} treinamento(s) — ver pág. 2</div>` : '')
            : `<div style="font-size:8px;color:${C.lightGray};">Consulte os itens contratados</div>`
        }
      </div>
    </div>

    <!-- 5. Composição do investimento -->
    <div class="section-head">
      <div class="section-icon">◎</div>
      <span class="section-title">COMPOSIÇÃO DO INVESTIMENTO</span>
      <div class="section-rule"></div>
    </div>

    <table class="invest-table">
      <thead>
        <tr>
          ${showPlan ? `<th>${esc(planType ? (PLAN_LABELS[planType] ?? planType) : 'Plano SST')}</th>` : ''}
          ${showTrainings ? `<th>Treinamentos</th>` : ''}
          <th>Total Anual</th>
          <th style="background:${C.navyDark};">Valor médio mensal</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          ${showPlan ? `
          <td>
            <span class="invest-sub">(${fmt(planFinal)}/ano)</span>
          </td>` : ''}
          ${showTrainings ? `
          <td>
            <span class="invest-val">${fmt(trainingFinal)}</span>
            <span class="invest-sub">(Pagamento único)</span>
          </td>` : ''}
          <td>
            <span class="invest-val">${fmt(q.total_value)}</span>
            <span class="invest-sub">${showPlan && showTrainings ? '(Plano + Treinamentos)' : '(Valor anual)'}</span>
          </td>
          <td>
            <div class="monthly-label">Valor médio mensal</div>
            <div class="monthly-rule"></div>
            <div class="monthly-value">${fmt(q.monthly_value)}<span style="font-size:13px;opacity:0.9;">/mês</span></div>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Banner info -->
    <div style="background:${C.bgInfo};border:1.2px solid #0F172A;border-top:0;border-radius:0 0 6px 6px;padding:10px 10px;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:20mm;">
      <span style="color:${C.teal};font-size:11px;font-weight:700;line-height:1;">ℹ</span>
      <span style="font-size:9px;color:${C.darkBlue};">O valor médio mensal considera o rateio do ${hasTrainings ? 'treinamento' : 'plano'} ao longo de 12 meses.</span>
    </div>

    <!-- 6. Barra de desconto (condicional) -->
    ${''}

    <!-- 7. Condições comerciais -->
    <div class="section-head">
      <div class="section-icon">◎</div>
      <span class="section-title">CONDIÇÕES COMERCIAIS</span>
      <div class="section-rule"></div>
    </div>
    <div class="cond-row">
      <div class="cond-item">
        <div class="cond-icon-box">📅</div>
        <div class="cond-text">
          <div class="cond-label">Validade da proposta</div>
          <div class="cond-value">Até ${fmtDate(q.valid_until)}</div>
        </div>
      </div>
      <div class="cond-item">
        <div class="cond-icon-box">🔄</div>
        <div class="cond-text">
          <div class="cond-label">Reajuste anual</div>
          <div class="cond-value">Conforme IPCA ou negociação</div>
        </div>
      </div>
      <div class="cond-item">
        <div class="cond-icon-box">💳</div>
        <div class="cond-text">
          <div class="cond-label">Forma de pagamento</div>
          <div class="cond-value">${esc(q.payment_terms || 'Mensal')}</div>
        </div>
      </div>
    </div>

    <!-- 8. Assinaturas -->
    <div class="sig-row">
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-name">Assinatura do Cliente</div>
      </div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-name">Clínica Inovassie — Responsável Comercial</div>
      </div>
    </div>

  </div><!-- /body -->
</div><!-- /page -->

<!-- ══════ PÁGINA 2 — Detalhamento (condicional) ══════ -->
${needsPage2 ? `
<div class="page page-break">

  <!-- Cabeçalho menor -->
  <div class="header">
    <div class="header-logo">
      Clínica Inovassie
    </div>
    <div class="header-badge">
      <div class="badge-value">${esc(q.quote_number)}</div>
    </div>
  </div>

  <div class="body">
    <div class="title" style="font-size:16px;margin-bottom:16px;">Detalhamento da Proposta</div>

    ${trainingTableSection}
    ${resumoInvestimentoSection}
  </div>
</div>` : ''}

<!-- Rodapé fixo -->
<div class="footer">
  <span>Clínica Inovassie — Saúde e Segurança do Trabalho &nbsp;·&nbsp; Esta proposta é válida por 30 dias.</span>
  <span>Documento gerado em ${fmtDate(new Date().toISOString())}</span>
</div>

</body>
</html>`
}

// ─── API pública ──────────────────────────────────────────────────────────────

/** Gera e compartilha o PDF do orçamento. Retorna o URI do arquivo gerado. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function shareQuotePdf(quote: any): Promise<string> {
  const letterheadDataUri = await assetToDataUri(require('../../assets/folhadeOrçamentoTimbrado.png'))
  const html = buildHtml(quote, letterheadDataUri)
  const { uri } = await Print.printToFileAsync({ html, base64: false })

  const canShare = await Sharing.isAvailableAsync()
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Orçamento ${quote.quote_number}`,
      UTI: 'com.adobe.pdf',
    })
  }
  return uri
}
