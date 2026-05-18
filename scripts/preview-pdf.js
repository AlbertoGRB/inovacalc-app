/**
 * Gera um HTML de preview do PDF mobile com dados mock + papel timbrado real.
 * Uso: node scripts/preview-pdf.js
 */
const fs = require('fs');
const path = require('path');

// ── Load letterhead as data URI ──
const letterheadPath = path.join(__dirname, '..', 'assets', 'folhadeOrçamentoTimbrado.png');
const letterheadBase64 = fs.readFileSync(letterheadPath).toString('base64');
const letterheadDataUri = `data:image/png;base64,${letterheadBase64}`;

// ── Palette ──
const C = {
  teal: '#17B7BD', tealLight: '#DDF4F6', tealMid: '#8DDFE4',
  navy: '#003B63', navyDark: '#112B4B', white: '#FFFFFF',
  text: '#1F2937', textSoft: '#475569', muted: '#94A3B8',
  bgInfo: '#E0F2FE', bgInfoText: '#1A3A5C', border: '#E5E7EB',
};
const SW = 1.7;
function fmt(v) { return (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function fmtDate(s) {
  if (!s) return '\u2014';
  try { const d = s.includes('T') ? new Date(s) : new Date(s + 'T12:00:00'); return d.toLocaleDateString('pt-BR'); } catch { return s; }
}
function esc(s) { return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

// ── SVG Icons ──
const svgCalendar = (sz=14) => `<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" fill="none"><rect x="3" y="5" width="18" height="16" rx="2" stroke="${C.teal}" stroke-width="${SW}" fill="none"/><line x1="3" y1="9" x2="21" y2="9" stroke="${C.teal}" stroke-width="${SW}"/><line x1="8" y1="3" x2="8" y2="7" stroke="${C.teal}" stroke-width="${SW}"/><line x1="16" y1="3" x2="16" y2="7" stroke="${C.teal}" stroke-width="${SW}"/></svg>`;
const svgDoc = (sz=14) => `<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" fill="none"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" stroke="${C.teal}" stroke-width="${SW}" fill="none"/><polyline points="14,3 14,9 20,9" stroke="${C.teal}" stroke-width="${SW}" fill="none"/></svg>`;
const svgBuilding = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none"><rect x="4" y="3" width="16" height="18" stroke="${C.teal}" stroke-width="${SW}" fill="none"/><line x1="8" y1="7" x2="10" y2="7" stroke="${C.teal}" stroke-width="${SW}"/><line x1="14" y1="7" x2="16" y2="7" stroke="${C.teal}" stroke-width="${SW}"/><line x1="8" y1="11" x2="10" y2="11" stroke="${C.teal}" stroke-width="${SW}"/><line x1="14" y1="11" x2="16" y2="11" stroke="${C.teal}" stroke-width="${SW}"/><line x1="8" y1="15" x2="10" y2="15" stroke="${C.teal}" stroke-width="${SW}"/><line x1="14" y1="15" x2="16" y2="15" stroke="${C.teal}" stroke-width="${SW}"/></svg>`;
const svgId = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="${C.teal}" stroke-width="${SW}" fill="none"/><circle cx="9" cy="11" r="2" stroke="${C.teal}" stroke-width="${SW}" fill="none"/><line x1="14" y1="10" x2="18" y2="10" stroke="${C.teal}" stroke-width="${SW}"/><line x1="14" y1="13" x2="18" y2="13" stroke="${C.teal}" stroke-width="${SW}"/></svg>`;
const svgShield = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" stroke="${C.teal}" stroke-width="${SW}" fill="none"/><polyline points="8.5,12 11,14.5 16,9.5" stroke="${C.teal}" stroke-width="${SW}" fill="none"/></svg>`;
const svgUser = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none"><circle cx="12" cy="8" r="4" stroke="${C.teal}" stroke-width="${SW}" fill="none"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7" stroke="${C.teal}" stroke-width="${SW}" fill="none"/></svg>`;
const svgBriefcase = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none"><rect x="3" y="7" width="18" height="13" rx="2" stroke="${C.teal}" stroke-width="${SW}" fill="none"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" stroke="${C.teal}" stroke-width="${SW}" fill="none"/></svg>`;
const svgPhone = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" stroke="${C.teal}" stroke-width="${SW}" fill="none"/></svg>`;
const svgMail = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="${C.teal}" stroke-width="${SW}" fill="none"/><polyline points="3,7 12,13 21,7" stroke="${C.teal}" stroke-width="${SW}" fill="none"/></svg>`;
const svgPin = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none"><path d="M12 22s8-7 8-13a8 8 0 0 0-16 0c0 6 8 13 8 13z" stroke="${C.teal}" stroke-width="${SW}" fill="none"/><circle cx="12" cy="9" r="2.5" stroke="${C.teal}" stroke-width="${SW}" fill="none"/></svg>`;
const svgCheckCircle = (sz=12) => `<svg viewBox="0 0 24 24" width="${sz}" height="${sz}"><circle cx="12" cy="12" r="11" fill="${C.teal}"/><polyline points="7,12.5 10.5,16 17,9.5" stroke="${C.white}" stroke-width="2.6" fill="none"/></svg>`;
const svgUserCircle = `<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="11" fill="${C.teal}"/><circle cx="12" cy="10" r="3.2" fill="${C.white}"/><path d="M5 20c1.5-3 4-4.5 7-4.5s5.5 1.5 7 4.5z" fill="${C.white}"/></svg>`;
const svgChartCircle = `<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="11" fill="${C.teal}"/><line x1="7" y1="17" x2="7" y2="12" stroke="${C.white}" stroke-width="2.2"/><line x1="12" y1="17" x2="12" y2="8" stroke="${C.white}" stroke-width="2.2"/><line x1="17" y1="17" x2="17" y2="14" stroke="${C.white}" stroke-width="2.2"/></svg>`;
const svgTargetCircle = `<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="11" fill="${C.teal}"/><circle cx="12" cy="12" r="6" stroke="${C.white}" stroke-width="1.8" fill="none"/><circle cx="12" cy="12" r="2.5" fill="${C.white}"/></svg>`;
const svgInfo = `<svg viewBox="0 0 24 24" width="12" height="12"><circle cx="12" cy="12" r="11" fill="${C.teal}"/><line x1="12" y1="11" x2="12" y2="17" stroke="${C.white}" stroke-width="2.6"/><circle cx="12" cy="7.5" r="1.4" fill="${C.white}"/></svg>`;
const svgRefresh = (sz=18) => `<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" fill="none"><path d="M3 12a9 9 0 0 1 15-6.7L21 8" stroke="${C.teal}" stroke-width="${SW}" fill="none"/><polyline points="21,3 21,8 16,8" stroke="${C.teal}" stroke-width="${SW}" fill="none"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16" stroke="${C.teal}" stroke-width="${SW}" fill="none"/><polyline points="3,21 3,16 8,16" stroke="${C.teal}" stroke-width="${SW}" fill="none"/></svg>`;
const svgCard = (sz=18) => `<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" fill="none"><rect x="3" y="6" width="18" height="13" rx="2" stroke="${C.teal}" stroke-width="${SW}" fill="none"/><line x1="3" y1="10" x2="21" y2="10" stroke="${C.teal}" stroke-width="${SW}"/><line x1="7" y1="15" x2="11" y2="15" stroke="${C.teal}" stroke-width="${SW}"/></svg>`;

// ── Mock data matching the PDF reference ──
const q = {
  quote_number: 'ORC-2026-0005',
  type: 'PLAN',
  total_value: 2777.54,
  monthly_value: 231.46,
  valid_until: '2026-06-15',
  created_at: '2026-05-16T10:30:00Z',
  payment_terms: 'Parcelamento em ate 12x sem juros',
};
const company = {
  company_name: 'Alberto',
  cnpj: 'TEMP-1778272141450',
  contact_role: null,
  contact_name: null,
  phone: null,
  email: null,
  risk_grade: 1,
  city: null,
  state: null,
};
const planLabel = 'Plano Integral';
const planFinal = 2777.54;
const isTempId = true;

const includedServices = [
  'Gestao basica de documentos de SST',
  'Orientacoes tecnicas e suporte',
  'Treinamentos conforme necessidade',
  'Emissao de registros e certificados',
];

const servicesContent = includedServices.map(s => `
  <div style="display:flex;align-items:flex-start;gap:9px;margin-bottom:15px;">
    <div style="margin-top:2px;">${svgCheckCircle(12)}</div>
    <span style="flex:1;font-size:7.9px;color:${C.text};line-height:1.25;">${esc(s)}</span>
  </div>`).join('');

// Investment columns (PLAN only, no trainings)
const investCols = `
  <div style="flex:1;background:${C.white};border:1.1px solid #0F172A;">
    <div style="background:${C.navy};padding:11px 6px;text-align:center;">
      <span style="font-size:10.6px;color:${C.white};font-weight:700;letter-spacing:0.3px;">${esc(planLabel)}</span>
    </div>
    <div style="height:1px;background:#0F172A;"></div>
    <div style="display:flex;align-items:center;justify-content:center;padding:13px 5px;min-height:64px;">
      <span style="font-size:7.8px;color:${C.textSoft};text-align:center;">(${fmt(planFinal)}/ano)</span>
    </div>
  </div>
  <div style="flex:1;background:${C.white};border-top:1.1px solid #0F172A;border-bottom:1.1px solid #0F172A;border-right:1.1px solid #0F172A;">
    <div style="background:${C.navy};padding:11px 6px;text-align:center;">
      <span style="font-size:10.6px;color:${C.white};font-weight:700;letter-spacing:0.3px;">Total Anual</span>
    </div>
    <div style="height:1px;background:#0F172A;"></div>
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:13px 5px;min-height:64px;">
      <span style="font-size:10.8px;font-weight:700;color:${C.teal};margin-bottom:2px;">${fmt(q.total_value)}</span>
      <span style="font-size:7.8px;color:${C.textSoft};text-align:center;">(Valor anual)</span>
    </div>
  </div>
  <div style="flex:1.5;background:${C.navy};display:flex;flex-direction:column;align-items:center;justify-content:center;padding:9px;border-top:1.1px solid #0F172A;border-right:1.1px solid #0F172A;border-bottom:1.1px solid #0F172A;">
    <div style="font-size:10px;font-weight:700;color:${C.white};margin-bottom:9px;text-align:center;letter-spacing:0.2px;">Valor medio mensal</div>
    <div style="width:120px;height:1.2px;background:${C.white};opacity:0.7;margin-bottom:10px;"></div>
    <div style="font-size:18.5px;font-weight:700;color:${C.white};text-align:center;">${fmt(q.monthly_value)}<span style="font-size:13px;font-weight:700;color:${C.white};opacity:0.85;">/mes</span></div>
  </div>`;

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Preview - ${esc(q.quote_number)}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    color: ${C.text};
    background: #888;
    font-size: 9px;
    line-height: 1.5;
  }
  .page {
    width: 210mm;
    min-height: 297mm;
    position: relative;
    overflow: hidden;
    background: ${C.white};
    margin: 20px auto;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  }
  .page::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image: url("${letterheadDataUri}");
    background-size: 100% 100%;
    background-repeat: no-repeat;
    z-index: 0;
  }
</style>
</head>
<body>

<div class="page">

  <!-- Badge -->
  <div style="position:absolute;top:30px;right:38px;background:${C.navyDark};border:0.8px solid ${C.white};border-radius:14px;padding:7px 12px;min-width:112px;text-align:center;z-index:2;">
    <span style="font-size:10.5px;font-weight:700;color:${C.white};letter-spacing:0.5px;">${esc(q.quote_number)}</span>
  </div>

  <div style="padding:94px 39px 0;position:relative;z-index:1;">

    <!-- Title -->
    <div style="margin-bottom:19px;">
      <div style="font-size:16.2px;font-weight:700;color:${C.navy};letter-spacing:0;margin-bottom:13px;">PROPOSTA COMERCIAL &mdash; ${planLabel.toUpperCase()}</div>
      <div style="height:1.2px;background:${C.teal};width:100%;"></div>
    </div>

    <!-- 3 info cards -->
    <div style="display:flex;gap:24px;margin-bottom:25px;">
      <div style="flex:1;display:flex;align-items:center;gap:7px;background:${C.white};border:1px solid ${C.tealMid};border-radius:6px;padding:10px 11px;min-height:45px;">
        <div style="width:29px;height:29px;border-radius:4px;background:${C.white};border:1px solid ${C.tealMid};display:flex;align-items:center;justify-content:center;">${svgCalendar(18)}</div>
        <div><div style="font-size:8.2px;font-weight:700;color:${C.navy};margin-bottom:1px;">Data de emissao</div><div style="font-size:10.5px;font-weight:700;color:${C.navy};">${fmtDate(q.created_at)}</div></div>
      </div>
      <div style="flex:1;display:flex;align-items:center;gap:7px;background:${C.white};border:1px solid ${C.tealMid};border-radius:6px;padding:10px 11px;min-height:45px;">
        <div style="width:29px;height:29px;border-radius:4px;background:${C.white};border:1px solid ${C.tealMid};display:flex;align-items:center;justify-content:center;">${svgCalendar(18)}</div>
        <div><div style="font-size:8.2px;font-weight:700;color:${C.navy};margin-bottom:1px;">Valida ate</div><div style="font-size:10.5px;font-weight:700;color:${C.navy};">${fmtDate(q.valid_until)}</div></div>
      </div>
      <div style="flex:1;display:flex;align-items:center;gap:7px;background:${C.white};border:1px solid ${C.tealMid};border-radius:6px;padding:10px 11px;min-height:45px;">
        <div style="width:29px;height:29px;border-radius:4px;background:${C.white};border:1px solid ${C.tealMid};display:flex;align-items:center;justify-content:center;">${svgDoc(18)}</div>
        <div><div style="font-size:8.2px;font-weight:700;color:${C.navy};margin-bottom:1px;">Tipo</div><div style="font-size:10.5px;font-weight:700;color:${C.navy};">Plano SST</div></div>
      </div>
    </div>

    <!-- DADOS DO CLIENTE -->
    <div style="display:flex;align-items:center;gap:7px;margin-bottom:17px;">
      ${svgUserCircle}
      <span style="font-size:10.8px;font-weight:700;color:${C.navy};letter-spacing:0.6px;">DADOS DO CLIENTE</span>
      <div style="flex:1;height:1.1px;background:${C.teal};margin-left:4px;"></div>
    </div>

    <div style="display:flex;gap:18px;margin-bottom:25px;">
      <div style="flex:1.78;">
        <div style="display:flex;flex-wrap:wrap;">
          <div style="width:50%;display:flex;align-items:flex-start;gap:8px;margin-bottom:18px;padding-right:4px;">
            <div style="margin-top:1px;">${svgBuilding}</div>
            <div style="flex:1;"><div style="font-size:7.2px;color:${C.navy};font-weight:700;margin-bottom:1px;">Razao social</div><div style="font-size:8.4px;color:${C.text};font-weight:700;">${esc(company.company_name)}</div></div>
          </div>
          <div style="width:50%;display:flex;align-items:flex-start;gap:8px;margin-bottom:18px;padding-right:4px;">
            <div style="margin-top:1px;">${svgBriefcase}</div>
            <div style="flex:1;"><div style="font-size:7.2px;color:${C.navy};font-weight:700;margin-bottom:1px;">Cargo</div><div style="font-size:8.4px;color:#111827;font-weight:700;">A preencher</div></div>
          </div>
          <div style="width:50%;display:flex;align-items:flex-start;gap:8px;margin-bottom:18px;padding-right:4px;">
            <div style="margin-top:1px;">${svgId}</div>
            <div style="flex:1;"><div style="font-size:7.2px;color:${C.navy};font-weight:700;margin-bottom:1px;">Identificacao provisoria</div><div style="font-size:8.4px;color:${C.text};font-weight:700;">${esc(company.cnpj)}</div></div>
          </div>
          <div style="width:50%;display:flex;align-items:flex-start;gap:8px;margin-bottom:18px;padding-right:4px;">
            <div style="margin-top:1px;">${svgPhone}</div>
            <div style="flex:1;"><div style="font-size:7.2px;color:${C.navy};font-weight:700;margin-bottom:1px;">Telefone</div><div style="font-size:8.4px;color:#111827;font-weight:700;">A preencher</div></div>
          </div>
          <div style="width:50%;display:flex;align-items:flex-start;gap:8px;margin-bottom:18px;padding-right:4px;">
            <div style="margin-top:1px;">${svgShield}</div>
            <div style="flex:1;"><div style="font-size:7.2px;color:${C.navy};font-weight:700;margin-bottom:1px;">Grau de risco</div><div style="font-size:8.4px;color:${C.text};font-weight:700;">Grau 1</div></div>
          </div>
          <div style="width:50%;display:flex;align-items:flex-start;gap:8px;margin-bottom:18px;padding-right:4px;">
            <div style="margin-top:1px;">${svgMail}</div>
            <div style="flex:1;"><div style="font-size:7.2px;color:${C.navy};font-weight:700;margin-bottom:1px;">E-mail</div><div style="font-size:8.4px;color:#111827;font-weight:700;">A preencher</div></div>
          </div>
          <div style="width:50%;display:flex;align-items:flex-start;gap:8px;margin-bottom:18px;padding-right:4px;">
            <div style="margin-top:1px;">${svgUser}</div>
            <div style="flex:1;"><div style="font-size:7.2px;color:${C.navy};font-weight:700;margin-bottom:1px;">Responsavel</div><div style="font-size:8.4px;color:#111827;font-weight:700;">A preencher</div></div>
          </div>
          <div style="width:50%;display:flex;align-items:flex-start;gap:8px;margin-bottom:18px;padding-right:4px;">
            <div style="margin-top:1px;">${svgPin}</div>
            <div style="flex:1;"><div style="font-size:7.2px;color:${C.navy};font-weight:700;margin-bottom:1px;">Cidade / Estado</div><div style="font-size:8.4px;color:#111827;font-weight:700;">A preencher</div></div>
          </div>
        </div>
      </div>

      <!-- SERVICOS INCLUSOS -->
      <div style="flex:1;background:${C.tealLight};border-radius:8px;padding:17px 15px;border:1px solid #98A8B3;min-height:160px;">
        <div style="display:flex;align-items:center;gap:9px;margin-bottom:14px;">
          ${svgCheckCircle(14)}
          <span style="font-size:10.2px;font-weight:700;color:${C.navy};letter-spacing:0.4px;">SERVICOS INCLUSOS</span>
        </div>
        ${servicesContent}
      </div>
    </div>

    <!-- COMPOSICAO DO INVESTIMENTO -->
    <div style="display:flex;align-items:center;gap:7px;margin-bottom:17px;">
      ${svgChartCircle}
      <span style="font-size:10.8px;font-weight:700;color:${C.navy};letter-spacing:0.6px;">COMPOSICAO DO INVESTIMENTO</span>
      <div style="flex:1;height:1.1px;background:${C.teal};margin-left:4px;"></div>
    </div>

    <div style="display:flex;min-height:96px;border-radius:4px;overflow:hidden;margin-bottom:0;">
      ${investCols}
    </div>

    <!-- Banner info -->
    <div style="background:${C.bgInfo};border-bottom-left-radius:4px;border-bottom-right-radius:4px;padding:10px;display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:34px;border-left:1.1px solid #0F172A;border-right:1.1px solid #0F172A;border-bottom:1.1px solid #0F172A;">
      ${svgInfo}
      <span style="font-size:8.6px;color:${C.bgInfoText};">O valor medio mensal considera o rateio do plano ao longo de 12 meses.</span>
    </div>

    <!-- CONDICOES COMERCIAIS -->
    <div style="display:flex;align-items:center;gap:7px;margin-bottom:17px;">
      ${svgTargetCircle}
      <span style="font-size:10.8px;font-weight:700;color:${C.navy};letter-spacing:0.6px;">CONDICOES COMERCIAIS</span>
      <div style="flex:1;height:1.1px;background:${C.teal};margin-left:4px;"></div>
    </div>
    <div style="display:flex;gap:34px;margin-bottom:10px;padding:0 2px;">
      <div style="flex:1;display:flex;align-items:center;gap:7px;">
        <div style="width:34px;height:34px;display:flex;align-items:center;justify-content:center;">${svgCalendar(18)}</div>
        <div style="flex:1;"><div style="font-size:7.6px;color:${C.navy};font-weight:700;margin-bottom:1px;">Validade da proposta</div><div style="font-size:8.2px;color:${C.text};">Ate ${fmtDate(q.valid_until)}</div></div>
      </div>
      <div style="flex:1;display:flex;align-items:center;gap:7px;">
        <div style="width:34px;height:34px;display:flex;align-items:center;justify-content:center;">${svgRefresh()}</div>
        <div style="flex:1;"><div style="font-size:7.6px;color:${C.navy};font-weight:700;margin-bottom:1px;">Reajuste anual</div><div style="font-size:8.2px;color:${C.text};">Conforme IPCA ou negociacao</div></div>
      </div>
      <div style="flex:1;display:flex;align-items:center;gap:7px;">
        <div style="width:34px;height:34px;display:flex;align-items:center;justify-content:center;">${svgCard()}</div>
        <div style="flex:1;"><div style="font-size:7.6px;color:${C.navy};font-weight:700;margin-bottom:1px;">Forma de pagamento</div><div style="font-size:8.2px;color:${C.text};">${esc(q.payment_terms)}</div></div>
      </div>
    </div>

    <!-- Signatures -->
    <div style="position:absolute;left:55px;right:55px;bottom:12px;display:flex;gap:88px;">
      <div style="flex:1;text-align:center;">
        <div style="border-top:1.2px solid ${C.navyDark};margin-bottom:8px;"></div>
        <div style="font-size:7px;color:${C.navy};text-align:center;">Assinatura do Cliente</div>
      </div>
      <div style="flex:1;text-align:center;">
        <div style="border-top:1.2px solid ${C.navyDark};margin-bottom:8px;"></div>
        <div style="font-size:7px;color:${C.navy};text-align:center;">Clinica Inovassie &mdash; Responsavel Comercial</div>
      </div>
    </div>

  </div>
</div>

</body>
</html>`;

const outPath = path.join(__dirname, '..', 'public', 'assets', 'pdf', 'preview-mobile-pdf.html');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, html, 'utf-8');
console.log('Preview gerado em: ' + outPath);
