import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getSignatureUrl } from './signature';
import { LETTERHEAD_BASE64 } from './letterhead';

// ─── Constantes de plano ────────────────────────────────────────────────────

const PLAN_LABELS: Record<string, string> = {
  ESSENCIAL: 'Plano Essencial',
  INTEGRAL:  'Plano Integral',
  AVANCADO:  'Plano Avançado',
}


// ─── Paleta (identica ao web ProposalPDF.tsx) ────────────────────────────────

const C = {
  teal:       '#17B7BD',
  tealLight:  '#DDF4F6',
  tealMid:    '#8DDFE4',
  navy:       '#003B63',
  navyDark:   '#112B4B',
  white:      '#FFFFFF',
  text:       '#1F2937',
  textSoft:   '#475569',
  muted:      '#94A3B8',
  bgInfo:     '#E0F2FE',
  bgInfoText: '#1A3A5C',
  border:     '#E5E7EB',
  amber:      '#F59E0B',
  amberBg:    '#FFFBEB',
  amberText:  '#78350F',
  success:    '#10B981',
  successBg:  '#D1FAE5',
  successText:'#065F46',
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(v: number): string {
  return (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(s: string): string {
  if (!s) return '\u2014'
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
  if (type === 'PLAN')     return `PROPOSTA COMERCIAL \u2014 ${planLabel.toUpperCase()}`
  if (type === 'TRAINING') return 'PROPOSTA COMERCIAL \u2014 TREINAMENTOS NR'
  return `PROPOSTA COMERCIAL \u2014 ${planLabel.toUpperCase()} + TREINAMENTOS`
}

function getTypeLabel(type: string): string {
  if (type === 'PLAN')     return 'Plano SST'
  if (type === 'TRAINING') return 'Treinamentos NR'
  return 'Planos e Treinamentos'
}

function buildIncludedServices(planType: string, _detail: any): string[] {
  const services: string[] = []

  services.push('Responsabilidade técnica')
  services.push('Entrega técnica TST')
  services.push('ART (quando aplicável)')
  services.push('Avaliações de risco')
  services.push('Elaboração de laudos')
  services.push('Quantificação')
  services.push('Deslocamento')

  if (planType === 'ESSENCIAL') {
    services.push('Ruído (exceto GR4)')
  } else {
    services.push('Ruído')
  }

  if (planType === 'INTEGRAL' || planType === 'AVANCADO') {
    services.push('Auditoria e-Social')
    services.push('Gestão e-Social')
    services.push('Gestão de Periódicos')
  }

  if (planType === 'AVANCADO') {
    services.push('Visita técnica bimestral')
    services.push('CAT e Gestão de afastados')
    services.push('Gestão de EPI')
    services.push('CIPA')
  }

  return services
}

// ─── Letterhead (imagem A4 completa como plano de fundo) ──

const letterheadHtml = `
  <img src="${LETTERHEAD_BASE64}" style="position:absolute;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;" />
`

// ─── SVG Icons (inline HTML, identicos ao web) ──────────────────────────────

const SW = 1.7

const svgCalendar = (size = 14) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="3" y="5" width="18" height="16" rx="2" stroke="${C.teal}" stroke-width="${SW}" fill="none"/>
  <line x1="3" y1="9" x2="21" y2="9" stroke="${C.teal}" stroke-width="${SW}"/>
  <line x1="8" y1="3" x2="8" y2="7" stroke="${C.teal}" stroke-width="${SW}"/>
  <line x1="16" y1="3" x2="16" y2="7" stroke="${C.teal}" stroke-width="${SW}"/>
</svg>`

const svgDoc = (size = 14) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" stroke="${C.teal}" stroke-width="${SW}" fill="none"/>
  <polyline points="14,3 14,9 20,9" stroke="${C.teal}" stroke-width="${SW}" fill="none"/>
</svg>`

const svgBuilding = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="4" y="3" width="16" height="18" stroke="${C.teal}" stroke-width="${SW}" fill="none"/>
  <line x1="8" y1="7" x2="10" y2="7" stroke="${C.teal}" stroke-width="${SW}"/>
  <line x1="14" y1="7" x2="16" y2="7" stroke="${C.teal}" stroke-width="${SW}"/>
  <line x1="8" y1="11" x2="10" y2="11" stroke="${C.teal}" stroke-width="${SW}"/>
  <line x1="14" y1="11" x2="16" y2="11" stroke="${C.teal}" stroke-width="${SW}"/>
  <line x1="8" y1="15" x2="10" y2="15" stroke="${C.teal}" stroke-width="${SW}"/>
  <line x1="14" y1="15" x2="16" y2="15" stroke="${C.teal}" stroke-width="${SW}"/>
</svg>`

const svgId = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="3" y="5" width="18" height="14" rx="2" stroke="${C.teal}" stroke-width="${SW}" fill="none"/>
  <circle cx="9" cy="11" r="2" stroke="${C.teal}" stroke-width="${SW}" fill="none"/>
  <line x1="14" y1="10" x2="18" y2="10" stroke="${C.teal}" stroke-width="${SW}"/>
  <line x1="14" y1="13" x2="18" y2="13" stroke="${C.teal}" stroke-width="${SW}"/>
</svg>`

const svgShield = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" stroke="${C.teal}" stroke-width="${SW}" fill="none"/>
  <polyline points="8.5,12 11,14.5 16,9.5" stroke="${C.teal}" stroke-width="${SW}" fill="none"/>
</svg>`

const svgUser = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="8" r="4" stroke="${C.teal}" stroke-width="${SW}" fill="none"/>
  <path d="M4 21c0-4 4-7 8-7s8 3 8 7" stroke="${C.teal}" stroke-width="${SW}" fill="none"/>
</svg>`

const svgBriefcase = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="3" y="7" width="18" height="13" rx="2" stroke="${C.teal}" stroke-width="${SW}" fill="none"/>
  <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" stroke="${C.teal}" stroke-width="${SW}" fill="none"/>
</svg>`

const svgPhone = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" stroke="${C.teal}" stroke-width="${SW}" fill="none"/>
</svg>`

const svgMail = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="3" y="5" width="18" height="14" rx="2" stroke="${C.teal}" stroke-width="${SW}" fill="none"/>
  <polyline points="3,7 12,13 21,7" stroke="${C.teal}" stroke-width="${SW}" fill="none"/>
</svg>`

const svgPin = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 22s8-7 8-13a8 8 0 0 0-16 0c0 6 8 13 8 13z" stroke="${C.teal}" stroke-width="${SW}" fill="none"/>
  <circle cx="12" cy="9" r="2.5" stroke="${C.teal}" stroke-width="${SW}" fill="none"/>
</svg>`

const svgCheckCircle = (size = 12) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="11" fill="${C.teal}"/>
  <polyline points="7,12.5 10.5,16 17,9.5" stroke="${C.white}" stroke-width="2.6" fill="none"/>
</svg>`

const svgUserCircle = `<svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="11" fill="${C.teal}"/>
  <circle cx="12" cy="10" r="3.2" fill="${C.white}"/>
  <path d="M5 20c1.5-3 4-4.5 7-4.5s5.5 1.5 7 4.5z" fill="${C.white}"/>
</svg>`

const svgChartCircle = `<svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="11" fill="${C.teal}"/>
  <line x1="7" y1="17" x2="7" y2="12" stroke="${C.white}" stroke-width="2.2"/>
  <line x1="12" y1="17" x2="12" y2="8" stroke="${C.white}" stroke-width="2.2"/>
  <line x1="17" y1="17" x2="17" y2="14" stroke="${C.white}" stroke-width="2.2"/>
</svg>`

const svgTargetCircle = `<svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="11" fill="${C.teal}"/>
  <circle cx="12" cy="12" r="6" stroke="${C.white}" stroke-width="1.8" fill="none"/>
  <circle cx="12" cy="12" r="2.5" fill="${C.white}"/>
</svg>`

const svgInfo = `<svg viewBox="0 0 24 24" width="12" height="12" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="11" fill="${C.teal}"/>
  <line x1="12" y1="11" x2="12" y2="17" stroke="${C.white}" stroke-width="2.6"/>
  <circle cx="12" cy="7.5" r="1.4" fill="${C.white}"/>
</svg>`

const svgRefresh = (size = 18) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M3 12a9 9 0 0 1 15-6.7L21 8" stroke="${C.teal}" stroke-width="${SW}" fill="none"/>
  <polyline points="21,3 21,8 16,8" stroke="${C.teal}" stroke-width="${SW}" fill="none"/>
  <path d="M21 12a9 9 0 0 1-15 6.7L3 16" stroke="${C.teal}" stroke-width="${SW}" fill="none"/>
  <polyline points="3,21 3,16 8,16" stroke="${C.teal}" stroke-width="${SW}" fill="none"/>
</svg>`

const svgCard = (size = 18) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="3" y="6" width="18" height="13" rx="2" stroke="${C.teal}" stroke-width="${SW}" fill="none"/>
  <line x1="3" y1="10" x2="21" y2="10" stroke="${C.teal}" stroke-width="${SW}"/>
  <line x1="7" y1="15" x2="11" y2="15" stroke="${C.teal}" stroke-width="${SW}"/>
</svg>`

// ─── Geracao do HTML ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildHtml(q: any, signatureDataUri?: string | null): string {
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
  const needsPage2 = trainingItems.length > 6

  const includedServices = planType
    ? buildIncludedServices(planType, planDetail)
    : []

  const showPlan      = includesPlan
  const showTrainings = includesTrainings

  const isTempId = typeof company.cnpj === 'string' && company.cnpj.startsWith('TEMP-')
  const docLabel = company.cpf && !company.cnpj ? 'CPF' : (isTempId ? 'Identifica\u00e7\u00e3o provis\u00f3ria' : 'CNPJ')
  const docValue = company.cpf && !company.cnpj ? company.cpf : (company.cnpj || 'A preencher')

  // Extrai valor do plano
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

  const planLabel = planType ? (PLAN_LABELS[planType] ?? planType) : 'Plano SST'

  // ── Servicos inclusos (conteudo do box) ───────────────────────────────────
  let servicesContent = ''
  if (showPlan && planType) {
    servicesContent = includedServices.map(s => `
      <div style="display:flex;align-items:flex-start;gap:9px;margin-bottom:15px;">
        <div style="margin-top:2px;">${svgCheckCircle(12)}</div>
        <span style="flex:1;font-size:7.9px;color:${C.text};line-height:1.25;">${esc(s)}</span>
      </div>`).join('')
  } else if (!showPlan && hasTrainings) {
    servicesContent = trainingItems.slice(0, 5).map((it: any) => `
      <div style="display:flex;align-items:flex-start;gap:9px;margin-bottom:15px;">
        <div style="margin-top:2px;">${svgCheckCircle(12)}</div>
        <span style="flex:1;font-size:7.9px;color:${C.text};line-height:1.25;">${esc(it.trainings?.code ?? 'NR')} \u2014 ${esc(it.trainings?.description ?? 'Treinamento')} (${it.quantity}x)</span>
      </div>`).join('')
    if (trainingItems.length > 5) {
      servicesContent += `<div style="font-size:7.5px;color:${C.textSoft};margin-left:18px;">+ ${trainingItems.length - 5} treinamento(s) \u2014 ver p\u00e1g. 2</div>`
    }
  } else if (!hasTrainings && includesTrainings) {
    servicesContent = `
      <div style="display:flex;align-items:flex-start;gap:9px;margin-bottom:15px;">
        <div style="margin-top:2px;">${svgCheckCircle(12)}</div>
        <span style="flex:1;font-size:7.9px;color:${C.text};line-height:1.25;">Treinamentos NR conforme contratado</span>
      </div>`
  } else if (!showPlan && !showTrainings) {
    servicesContent = `<div style="font-size:8px;color:${C.muted};">Consulte os itens contratados</div>`
  }

  // ── Colunas de investimento ───────────────────────────────────────────────
  let investCols = ''

  if (showPlan) {
    investCols += `
      <div style="flex:1;background:${C.white};border:1.1px solid #0F172A;">
        <div style="background:${C.navy};padding:11px 6px;text-align:center;">
          <span style="font-size:10.6px;color:${C.white};font-weight:700;letter-spacing:0.3px;">${esc(planLabel)}</span>
        </div>
        <div style="height:1px;background:#0F172A;"></div>
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:13px 5px;min-height:64px;">
          <span style="font-size:7.8px;color:${C.textSoft};text-align:center;">(${fmt(planFinal)}/ano)</span>
        </div>
      </div>`
  }

  if (showTrainings) {
    const borderStyle = showPlan
      ? 'border-top:1.1px solid #0F172A;border-bottom:1.1px solid #0F172A;border-right:1.1px solid #0F172A;'
      : 'border:1.1px solid #0F172A;'
    investCols += `
      <div style="flex:1;background:${C.white};${borderStyle}">
        <div style="background:${C.navy};padding:11px 6px;text-align:center;">
          <span style="font-size:10.6px;color:${C.white};font-weight:700;letter-spacing:0.3px;">Treinamentos</span>
        </div>
        <div style="height:1px;background:#0F172A;"></div>
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:13px 5px;min-height:64px;">
          <span style="font-size:10.8px;font-weight:700;color:${C.teal};margin-bottom:2px;">${fmt(trainingFinal)}</span>
          <span style="font-size:7.8px;color:${C.textSoft};text-align:center;">(Pagamento \u00fanico)</span>
        </div>
      </div>`
  }

  // Total Anual column
  const totalBorderStyle = (showPlan || showTrainings)
    ? 'border-top:1.1px solid #0F172A;border-bottom:1.1px solid #0F172A;border-right:1.1px solid #0F172A;'
    : 'border:1.1px solid #0F172A;'
  investCols += `
    <div style="flex:1;background:${C.white};${totalBorderStyle}">
      <div style="background:${C.navy};padding:11px 6px;text-align:center;">
        <span style="font-size:10.6px;color:${C.white};font-weight:700;letter-spacing:0.3px;">Total Anual</span>
      </div>
      <div style="height:1px;background:#0F172A;"></div>
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:13px 5px;min-height:64px;">
        <span style="font-size:10.8px;font-weight:700;color:${C.teal};margin-bottom:2px;">${fmt(q.total_value)}</span>
        <span style="font-size:7.8px;color:${C.textSoft};text-align:center;">${showPlan && showTrainings ? '(Plano + Treinamentos)' : '(Valor anual)'}</span>
      </div>
    </div>`

  // Monthly column
  investCols += `
    <div style="flex:1.5;background:${C.navy};display:flex;flex-direction:column;align-items:center;justify-content:center;padding:9px;border-top:1.1px solid #0F172A;border-right:1.1px solid #0F172A;border-bottom:1.1px solid #0F172A;">
      <div style="font-size:10px;font-weight:700;color:${C.white};margin-bottom:9px;text-align:center;letter-spacing:0.2px;">Valor m\u00e9dio mensal</div>
      <div style="width:120px;height:1.2px;background:${C.white};opacity:0.7;margin-bottom:10px;"></div>
      <div style="font-size:18.5px;font-weight:700;color:${C.white};text-align:center;">${fmt(q.monthly_value)}<span style="font-size:13px;font-weight:700;color:${C.white};opacity:0.85;">/m\u00eas</span></div>
    </div>`

  // ── Pagina 2: tabela detalhada de treinamentos ─────────────────────────────
  let page2Html = ''
  if (needsPage2 && hasTrainings) {
    const items: any[] = trainingItems
    const subtotal    = trainDetail.subtotal ?? 0
    const discountPct = trainDetail.plan_discount ?? 0
    const finalValue  = trainDetail.final_value ?? 0

    let tableRows = ''
    items.forEach((item: any, i: number) => {
      const bgColor = i % 2 === 0 ? C.white : '#F9FAFB'
      tableRows += `
        <div style="display:flex;padding:6px 8px;border-bottom:0.5px solid #F3F4F6;background:${bgColor};">
          <div style="width:12%;font-size:7.5px;color:${C.text};font-weight:700;">${esc(item.trainings?.code ?? '\u2014')}</div>
          <div style="flex:1;font-size:7.5px;color:${C.text};">${esc(item.trainings?.description ?? '\u2014')}</div>
          <div style="width:8%;font-size:7.5px;color:${C.text};text-align:center;">${item.quantity}</div>
          <div style="width:18%;font-size:7.5px;color:${C.text};text-align:right;">${fmt(item.unit_value)}</div>
          <div style="width:18%;font-size:7.5px;color:${C.text};font-weight:700;text-align:right;">${fmt(item.total_value)}</div>
        </div>`
    })

    let discountRow = ''
    if (discountPct > 0) {
      discountRow = `
        <div style="display:flex;padding:7px 8px;background:#A7F3D0;">
          <div style="flex:1;font-size:7.5px;color:${C.text};font-weight:700;">Desconto do plano (${discountPct}%)</div>
          <div style="width:18%;font-size:7.5px;color:${C.text};font-weight:700;text-align:right;">- ${fmt(subtotal * discountPct / 100)}</div>
        </div>`
    }

    page2Html = `
<!-- ══════ PAGINA 2 ══════ -->
<div class="page page-break">

  <!-- Papel timbrado Inovassie (header + watermark) -->
  ${letterheadHtml}

  <!-- Badge ORE sobreposto ao header -->
  <div style="position:absolute;top:22px;right:38px;background:${C.navyDark};border:0.8px solid ${C.white};border-radius:14px;padding:7px 12px;min-width:112px;text-align:center;z-index:2;">
    <span style="font-size:10.5px;font-weight:700;color:${C.white};letter-spacing:0.5px;">${esc(q.quote_number)}</span>
  </div>

  <!-- Corpo pagina 2 -->
  <div style="padding:100px 32px 30px;position:relative;z-index:1;">

    <!-- Secao header -->
    <div style="display:flex;align-items:center;gap:7px;margin-bottom:17px;">
      ${svgChartCircle}
      <span style="font-size:10.8px;font-weight:700;color:${C.navy};letter-spacing:0.6px;">DETALHAMENTO \u2014 TREINAMENTOS NR</span>
      <div style="flex:1;height:1.1px;background:${C.teal};margin-left:4px;"></div>
    </div>

    <!-- Tabela -->
    <div style="border:1px solid ${C.border};border-radius:5px;overflow:hidden;margin-bottom:14px;">
      <!-- Header -->
      <div style="display:flex;background:${C.navy};padding:7px 8px;">
        <div style="width:12%;font-size:7.5px;color:${C.white};font-weight:700;">C\u00f3digo</div>
        <div style="flex:1;font-size:7.5px;color:${C.white};font-weight:700;">Descri\u00e7\u00e3o</div>
        <div style="width:8%;font-size:7.5px;color:${C.white};font-weight:700;text-align:center;">Qtd</div>
        <div style="width:18%;font-size:7.5px;color:${C.white};font-weight:700;text-align:right;">Valor Unit.</div>
        <div style="width:18%;font-size:7.5px;color:${C.white};font-weight:700;text-align:right;">Total</div>
      </div>
      <!-- Rows -->
      ${tableRows}
      <!-- Subtotal -->
      <div style="display:flex;padding:7px 8px;background:${C.tealLight};">
        <div style="flex:1;font-size:7.5px;color:${C.text};font-weight:700;">Subtotal</div>
        <div style="width:18%;font-size:7.5px;color:${C.text};font-weight:700;text-align:right;">${fmt(subtotal)}</div>
      </div>
      ${discountRow}
      <!-- Valor Final -->
      <div style="display:flex;padding:7px 8px;background:${C.navy};">
        <div style="flex:1;font-size:7.5px;color:${C.white};font-weight:700;">Valor Final</div>
        <div style="width:18%;font-size:7.5px;color:${C.white};font-weight:700;text-align:right;">${fmt(finalValue)}</div>
      </div>
    </div>

  </div><!-- /body p2 -->
</div><!-- /page 2 -->`
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Or\u00e7amento ${esc(q.quote_number)}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    color: ${C.text};
    background: ${C.white};
    font-size: 9px;
    line-height: 1.2;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page {
    width: 210mm;
    height: 297mm;
    position: relative;
    overflow: hidden;
    background: ${C.white};
  }
  .letterhead {
    position: absolute;
    top: 0; left: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
    pointer-events: none;
  }
  .page-break { page-break-before: always; }
  @media print {
    body { margin: 0; }
    .page { page-break-after: always; box-shadow: none; }
  }
</style>
</head>
<body>

<!-- ══════ PAGINA 1 ══════ -->
<div class="page">

  <!-- Papel timbrado Inovassie (header + watermark) -->
  ${letterheadHtml}

  <!-- Badge ORE sobreposto ao header -->
  <div style="position:absolute;top:28px;right:38px;background:${C.navyDark};border:0.8px solid ${C.white};border-radius:14px;padding:7px 12px;min-width:112px;text-align:center;z-index:2;">
    <span style="font-size:10.5px;font-weight:700;color:${C.white};letter-spacing:0.5px;">${esc(q.quote_number)}</span>
  </div>

  <!-- Corpo -->
  <div style="padding:120px 39px 30px;position:relative;z-index:1;">

    <!-- Titulo -->
    <div style="margin-bottom:19px;">
      <div style="font-size:16.2px;font-weight:700;color:${C.navy};letter-spacing:0;margin-bottom:13px;">${getTitle(q.type, planType)}</div>
      <div style="height:1.2px;background:${C.teal};width:100%;"></div>
    </div>

    <!-- 3 cards info -->
    <div style="display:flex;gap:24px;margin-bottom:25px;">
      <div style="flex:1;display:flex;align-items:center;gap:7px;background:${C.white};border:1px solid ${C.tealMid};border-radius:6px;padding:10px 11px;min-height:45px;">
        <div style="width:29px;height:29px;border-radius:4px;background:${C.white};border:1px solid ${C.tealMid};display:flex;align-items:center;justify-content:center;">
          ${svgCalendar(18)}
        </div>
        <div>
          <div style="font-size:8.2px;font-weight:700;color:${C.navy};margin-bottom:1px;">Data de emiss\u00e3o</div>
          <div style="font-size:10.5px;font-weight:700;color:${C.navy};">${fmtDate(q.created_at)}</div>
        </div>
      </div>
      <div style="flex:1;display:flex;align-items:center;gap:7px;background:${C.white};border:1px solid ${C.tealMid};border-radius:6px;padding:10px 11px;min-height:45px;">
        <div style="width:29px;height:29px;border-radius:4px;background:${C.white};border:1px solid ${C.tealMid};display:flex;align-items:center;justify-content:center;">
          ${svgCalendar(18)}
        </div>
        <div>
          <div style="font-size:8.2px;font-weight:700;color:${C.navy};margin-bottom:1px;">V\u00e1lida at\u00e9</div>
          <div style="font-size:10.5px;font-weight:700;color:${C.navy};">${fmtDate(q.valid_until)}</div>
        </div>
      </div>
      <div style="flex:1;display:flex;align-items:center;gap:7px;background:${C.white};border:1px solid ${C.tealMid};border-radius:6px;padding:10px 11px;min-height:45px;">
        <div style="width:29px;height:29px;border-radius:4px;background:${C.white};border:1px solid ${C.tealMid};display:flex;align-items:center;justify-content:center;">
          ${svgDoc(18)}
        </div>
        <div>
          <div style="font-size:8.2px;font-weight:700;color:${C.navy};margin-bottom:1px;">Tipo</div>
          <div style="font-size:10.5px;font-weight:700;color:${C.navy};">${getTypeLabel(q.type)}</div>
        </div>
      </div>
    </div>

    <!-- DADOS DO CLIENTE -->
    <div style="display:flex;align-items:center;gap:7px;margin-bottom:17px;">
      ${svgUserCircle}
      <span style="font-size:10.8px;font-weight:700;color:${C.navy};letter-spacing:0.6px;">DADOS DO CLIENTE</span>
      <div style="flex:1;height:1.1px;background:${C.teal};margin-left:4px;"></div>
    </div>

    <div style="display:flex;gap:18px;margin-bottom:25px;">
      <!-- Grid 2x4 de campos -->
      <div style="flex:1.78;">
        <div style="display:flex;flex-wrap:wrap;">
          <!-- Razao social -->
          <div style="width:50%;display:flex;align-items:flex-start;gap:8px;margin-bottom:18px;padding-right:4px;">
            <div style="margin-top:1px;">${svgBuilding}</div>
            <div style="flex:1;">
              <div style="font-size:7.2px;color:${C.navy};font-weight:700;margin-bottom:1px;">Raz\u00e3o social</div>
              <div style="font-size:8.4px;color:${C.text};font-weight:700;">${esc(company.company_name || company.trade_name || 'A preencher')}</div>
            </div>
          </div>
          <!-- Cargo -->
          <div style="width:50%;display:flex;align-items:flex-start;gap:8px;margin-bottom:18px;padding-right:4px;">
            <div style="margin-top:1px;">${svgBriefcase}</div>
            <div style="flex:1;">
              <div style="font-size:7.2px;color:${C.navy};font-weight:700;margin-bottom:1px;">Cargo</div>
              <div style="font-size:8.4px;color:${company.contact_role ? C.text : '#111827'};font-weight:700;">${esc(company.contact_role || 'A preencher')}</div>
            </div>
          </div>
          <!-- CNPJ -->
          <div style="width:50%;display:flex;align-items:flex-start;gap:8px;margin-bottom:18px;padding-right:4px;">
            <div style="margin-top:1px;">${svgId}</div>
            <div style="flex:1;">
              <div style="font-size:7.2px;color:${C.navy};font-weight:700;margin-bottom:1px;">${docLabel}</div>
              <div style="font-size:8.4px;color:${docValue !== 'A preencher' ? C.text : '#111827'};font-weight:700;">${esc(docValue)}</div>
            </div>
          </div>
          <!-- Telefone -->
          <div style="width:50%;display:flex;align-items:flex-start;gap:8px;margin-bottom:18px;padding-right:4px;">
            <div style="margin-top:1px;">${svgPhone}</div>
            <div style="flex:1;">
              <div style="font-size:7.2px;color:${C.navy};font-weight:700;margin-bottom:1px;">Telefone</div>
              <div style="font-size:8.4px;color:${company.phone ? C.text : '#111827'};font-weight:700;">${esc(company.phone || 'A preencher')}</div>
            </div>
          </div>
          <!-- Grau de risco -->
          <div style="width:50%;display:flex;align-items:flex-start;gap:8px;margin-bottom:18px;padding-right:4px;">
            <div style="margin-top:1px;">${svgShield}</div>
            <div style="flex:1;">
              <div style="font-size:7.2px;color:${C.navy};font-weight:700;margin-bottom:1px;">Grau de risco</div>
              <div style="font-size:8.4px;color:${company.risk_grade ? C.text : '#111827'};font-weight:700;">${company.risk_grade ? `Grau ${company.risk_grade}` : 'A preencher'}</div>
            </div>
          </div>
          <!-- E-mail -->
          <div style="width:50%;display:flex;align-items:flex-start;gap:8px;margin-bottom:18px;padding-right:4px;">
            <div style="margin-top:1px;">${svgMail}</div>
            <div style="flex:1;">
              <div style="font-size:7.2px;color:${C.navy};font-weight:700;margin-bottom:1px;">E-mail</div>
              <div style="font-size:8.4px;color:${company.email ? C.text : '#111827'};font-weight:700;">${esc(company.email || 'A preencher')}</div>
            </div>
          </div>
          <!-- Responsavel -->
          <div style="width:50%;display:flex;align-items:flex-start;gap:8px;margin-bottom:18px;padding-right:4px;">
            <div style="margin-top:1px;">${svgUser}</div>
            <div style="flex:1;">
              <div style="font-size:7.2px;color:${C.navy};font-weight:700;margin-bottom:1px;">Respons\u00e1vel</div>
              <div style="font-size:8.4px;color:${company.contact_name ? C.text : '#111827'};font-weight:700;">${esc(company.contact_name || 'A preencher')}</div>
            </div>
          </div>
          <!-- Cidade / Estado -->
          <div style="width:50%;display:flex;align-items:flex-start;gap:8px;margin-bottom:18px;padding-right:4px;">
            <div style="margin-top:1px;">${svgPin}</div>
            <div style="flex:1;">
              <div style="font-size:7.2px;color:${C.navy};font-weight:700;margin-bottom:1px;">Cidade / Estado</div>
              <div style="font-size:8.4px;color:${(company.city && company.state) ? C.text : '#111827'};font-weight:700;">${company.city && company.state ? `${esc(company.city)} / ${esc(company.state)}` : 'A preencher'}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- SERVICOS INCLUSOS box -->
      <div style="flex:1;background:${C.tealLight};border-radius:8px;padding:17px 15px;border:1px solid #98A8B3;min-height:160px;">
        <div style="display:flex;align-items:center;gap:9px;margin-bottom:14px;">
          ${svgCheckCircle(14)}
          <span style="font-size:10.2px;font-weight:700;color:${C.navy};letter-spacing:0.4px;">SERVI\u00c7OS INCLUSOS</span>
        </div>
        ${servicesContent}
      </div>
    </div>

    <!-- COMPOSICAO DO INVESTIMENTO -->
    <div style="display:flex;align-items:center;gap:7px;margin-bottom:17px;">
      ${svgChartCircle}
      <span style="font-size:10.8px;font-weight:700;color:${C.navy};letter-spacing:0.6px;">COMPOSI\u00c7\u00c3O DO INVESTIMENTO</span>
      <div style="flex:1;height:1.1px;background:${C.teal};margin-left:4px;"></div>
    </div>

    <div style="display:flex;min-height:96px;border-radius:4px;overflow:hidden;margin-bottom:0;">
      ${investCols}
    </div>

    <!-- Banner info -->
    <div style="background:${C.bgInfo};border-bottom-left-radius:4px;border-bottom-right-radius:4px;padding:10px;display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:34px;border-left:1.1px solid #0F172A;border-right:1.1px solid #0F172A;border-bottom:1.1px solid #0F172A;">
      ${svgInfo}
      <span style="font-size:8.6px;color:${C.bgInfoText};">O valor m\u00e9dio mensal considera o rateio do ${showTrainings ? 'treinamento' : 'plano'} ao longo de 12 meses.</span>
    </div>

    <!-- CONDICOES COMERCIAIS -->
    <div style="display:flex;align-items:center;gap:7px;margin-bottom:17px;">
      ${svgTargetCircle}
      <span style="font-size:10.8px;font-weight:700;color:${C.navy};letter-spacing:0.6px;">CONDI\u00c7\u00d5ES COMERCIAIS</span>
      <div style="flex:1;height:1.1px;background:${C.teal};margin-left:4px;"></div>
    </div>
    <div style="display:flex;gap:34px;margin-bottom:10px;padding:0 2px;">
      <div style="flex:1;display:flex;align-items:center;gap:7px;">
        <div style="width:34px;height:34px;display:flex;align-items:center;justify-content:center;">
          ${svgCalendar(18)}
        </div>
        <div style="flex:1;">
          <div style="font-size:7.6px;color:${C.navy};font-weight:700;margin-bottom:1px;">Validade da proposta</div>
          <div style="font-size:8.2px;color:${C.text};">At\u00e9 ${fmtDate(q.valid_until)}</div>
        </div>
      </div>
      <div style="flex:1;display:flex;align-items:center;gap:7px;">
        <div style="width:34px;height:34px;display:flex;align-items:center;justify-content:center;">
          ${svgRefresh()}
        </div>
        <div style="flex:1;">
          <div style="font-size:7.6px;color:${C.navy};font-weight:700;margin-bottom:1px;">Reajuste anual</div>
          <div style="font-size:8.2px;color:${C.text};">Conforme IPCA ou negocia\u00e7\u00e3o</div>
        </div>
      </div>
      <div style="flex:1;display:flex;align-items:center;gap:7px;">
        <div style="width:34px;height:34px;display:flex;align-items:center;justify-content:center;">
          ${svgCard()}
        </div>
        <div style="flex:1;">
          <div style="font-size:7.6px;color:${C.navy};font-weight:700;margin-bottom:1px;">Forma de pagamento</div>
          <div style="font-size:8.2px;color:${C.text};">${esc(q.payment_terms || 'Mensal')}</div>
        </div>
      </div>
    </div>

  </div><!-- /body -->

  <!-- Assinaturas - posicionadas na Page, nao no body (identico ao web sigRow) -->
  <div style="position:absolute;left:55px;right:55px;bottom:12px;display:flex;gap:88px;z-index:1;">
    <div style="flex:1;text-align:center;">
      ${signatureDataUri ? `<img src="${signatureDataUri}" style="width:140px;height:50px;object-fit:contain;margin:0 auto 4px;display:block;" />` : ''}
      <div style="border-top:1.2px solid ${C.navyDark};margin-bottom:8px;"></div>
      <div style="font-size:7px;color:${C.navy};text-align:center;">Assinatura do Cliente</div>
    </div>
    <div style="flex:1;text-align:center;">
      <div style="border-top:1.2px solid ${C.navyDark};margin-bottom:8px;"></div>
      <div style="font-size:7px;color:${C.navy};text-align:center;">Cl\u00ednica Inovassie \u2014 Respons\u00e1vel Comercial</div>
    </div>
  </div>

</div><!-- /page -->

${page2Html}

</body>
</html>`
}

// ─── API publica ────────────────────────────────────────────────────────────

/** Gera e compartilha o PDF do orcamento. Retorna o URI do arquivo gerado. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function shareQuotePdf(quote: any): Promise<string> {
  // Fetch signature signed URL if exists
  let signatureUrl: string | null = null
  if (quote.signature_url) {
    signatureUrl = await getSignatureUrl(quote.signature_url).catch(() => null)
  }
  const html = buildHtml(quote, signatureUrl)
  const { uri } = await Print.printToFileAsync({ html, base64: false })

  const canShare = await Sharing.isAvailableAsync()
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Or\u00e7amento ${quote.quote_number}`,
      UTI: 'com.adobe.pdf',
    })
  }
  return uri
}
