import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TemplateConfig {
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  fontSize: "small" | "medium" | "large";
  layout: "classic" | "modern" | "compact";
  showLogo: boolean;
  showCompanyDetails: boolean;
  showClientDetails: boolean;
  headerStyle: "full" | "minimal";
}

const defaultConfig: TemplateConfig = {
  primaryColor: "#2563eb",
  accentColor: "#f97316",
  fontFamily: "Inter",
  fontSize: "medium",
  layout: "classic",
  showLogo: true,
  showCompanyDetails: true,
  showClientDetails: true,
  headerStyle: "full",
};

// -------- Safe helpers --------
const ALLOWED_FONTS = new Set(['Inter', 'Roboto', 'Georgia']);
const ALLOWED_STATUSES = new Set([
  'unpaid', 'paid_by_holdback', 'holdback_remaining', 'fully_paid', 'draft'
]);

function escapeHtml(input: unknown): string {
  if (input === null || input === undefined) return '';
  const s = String(input);
  return s.replace(/[&<>"']/g, (m) => {
    switch (m) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#039;';
      default: return m;
    }
  });
}

function safeHexColor(color: unknown, fallback: string): string {
  if (typeof color !== 'string') return fallback;
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : fallback;
}

function safeFont(font: unknown, fallback: string): string {
  if (typeof font === 'string' && ALLOWED_FONTS.has(font)) return font;
  return fallback;
}

function safeStatus(status: unknown): string {
  if (typeof status === 'string' && ALLOWED_STATUSES.has(status)) return status;
  return 'draft';
}

function safeImageUrl(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

function escapeMultiline(input: unknown): string {
  return escapeHtml(input).replace(/\r?\n/g, '<br>');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { invoiceId, templateConfig } = await req.json();
    const incoming = (templateConfig ?? {}) as Partial<TemplateConfig>;
    const config: TemplateConfig = {
      ...defaultConfig,
      ...incoming,
      primaryColor: safeHexColor(incoming.primaryColor, defaultConfig.primaryColor),
      accentColor: safeHexColor(incoming.accentColor, defaultConfig.accentColor),
      fontFamily: safeFont(incoming.fontFamily, defaultConfig.fontFamily),
    };

    console.log('Generating PDF for invoice:', invoiceId, 'with config:', config.layout);

    if (!invoiceId) {
      throw new Error('Invoice ID is required');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: invoice, error: invoiceError } = await supabaseClient
      .from('invoices')
      .select(`
        *,
        line_items:invoice_line_items(*),
        attachments:invoice_attachments(*)
      `)
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .single();

    if (invoiceError || !invoice) {
      console.error('Invoice fetch error:', invoiceError);
      throw new Error('Invoice not found or access denied');
    }

    invoice.line_items = (invoice.line_items || []).sort((a: any, b: any) => a.item_order - b.item_order);

    let logoUrl: string | null = null;
    if (config.showLogo && invoice.company_id) {
      const { data: company } = await supabaseClient
        .from('companies')
        .select('logo_url')
        .eq('id', invoice.company_id)
        .single();

      if (company?.logo_url) {
        logoUrl = safeImageUrl(company.logo_url);
      }
    }

    const html = generateInvoiceHTML(invoice, config, logoUrl);
    console.log('PDF HTML generated successfully');

    return new Response(html, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error: any) {
    console.error('Error generating invoice PDF:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
}

function getFontSize(size: string): { base: string; small: string; large: string; xlarge: string } {
  switch (size) {
    case 'small':
      return { base: '9pt', small: '8pt', large: '11pt', xlarge: '16pt' };
    case 'large':
      return { base: '12pt', small: '10pt', large: '14pt', xlarge: '22pt' };
    default:
      return { base: '10pt', small: '9pt', large: '12pt', xlarge: '18pt' };
  }
}

function generateInvoiceHTML(invoice: any, config: TemplateConfig, logoUrl: string | null): string {
  const fontSize = getFontSize(config.fontSize);
  const hasHoldback = invoice.holdback_enabled && invoice.holdback_amount > 0;

  const primary = config.primaryColor;
  const fontFamily = config.fontFamily;
  const status = safeStatus(invoice.status);
  const statusLabel = escapeHtml(status.replace(/_/g, ' '));

  const lineItemsHTML = invoice.line_items.map((item: any, index: number) => `
    <tr>
      <td>${index + 1}</td>
      <td class="desc-col">${escapeHtml(item.description || '')}</td>
      <td class="num-col">${(Number(item.hours) || 0).toFixed(1)}</td>
      <td class="num-col">${formatCurrency(Number(item.price) || 0)}</td>
      <td class="num-col amount-col">${formatCurrency(Number(item.amount) || 0)}</td>
    </tr>
  `).join('');

  const layoutStyles = config.layout === 'modern' ? `
    .header { border-bottom: none; padding-bottom: 0; }
    .invoice-box { border: none; background: ${primary}10; }
    .bill-to { border-left: none; background: transparent; border: 1px solid #e5e7eb; }
    table { border-radius: 8px; overflow: hidden; }
  ` : config.layout === 'compact' ? `
    body { padding: 0.3in; }
    .header { margin-bottom: 16px; padding-bottom: 12px; }
    .bill-to { padding: 12px; margin-bottom: 16px; }
    table td, table th { padding: 6px 8px; }
    .totals { width: 240px; }
  ` : '';

  const invoiceDate = (() => {
    try {
      return new Date(invoice.invoice_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return '';
    }
  })();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Invoice ${escapeHtml(invoice.invoice_number)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto:wght@400;500;700&family=Georgia&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    @page { size: Letter; margin: 0.5in; }

    @media print {
      html, body { width: 8.5in; height: 11in; }
      .page-break { page-break-before: always; }
    }

    body {
      font-family: '${fontFamily}', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: ${fontSize.base};
      line-height: 1.4;
      color: #1f2937;
      background: #fff;
      padding: 0.5in;
      max-width: 8.5in;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 3px solid ${primary};
    }

    .company-info { display: flex; align-items: flex-start; gap: 16px; }
    .company-logo { width: 80px; height: 80px; object-fit: contain; border-radius: 8px; }
    .company-info h1 { color: ${primary}; font-size: ${fontSize.xlarge}; font-weight: 700; margin-bottom: 8px; }
    .company-info p { font-size: ${fontSize.small}; color: #4b5563; margin: 2px 0; }

    .invoice-box { border: 2px solid #e5e7eb; padding: 12px 16px; text-align: right; min-width: 180px; }
    .invoice-box h2 { color: ${primary}; font-size: ${fontSize.xlarge}; font-weight: 700; margin-bottom: 8px; }
    .invoice-box p { font-size: ${fontSize.small}; margin: 3px 0; }

    .bill-to { background: #f3f4f6; padding: 16px; margin-bottom: 20px; border-left: 4px solid ${primary}; }
    .bill-to h3 { color: ${primary}; font-size: ${fontSize.base}; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    .bill-to p { font-size: ${fontSize.small}; margin: 2px 0; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: ${fontSize.small}; }
    thead { background: ${primary}; color: white; }
    th { padding: 10px 8px; text-align: left; font-weight: 600; font-size: ${fontSize.small}; }
    th.num-col, td.num-col { text-align: right; width: 70px; }
    th.amount-col, td.amount-col { width: 90px; }
    th:first-child { width: 30px; }
    td { padding: 10px 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
    td.desc-col { max-width: 300px; word-wrap: break-word; }
    tbody tr:nth-child(even) { background: #f9fafb; }

    .totals-section { display: flex; justify-content: flex-end; margin-bottom: 20px; }
    .totals { width: 280px; font-size: ${fontSize.small}; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e5e7eb; }
    .totals-row.subtotal { font-weight: 600; }
    .totals-row.holdback { color: #dc2626; background: #fef2f2; margin: 0 -8px; padding: 6px 8px; }
    .totals-row.net { font-weight: 600; background: #f0f9ff; margin: 0 -8px; padding: 6px 8px; }
    .totals-row.total { font-size: ${fontSize.large}; font-weight: 700; color: ${primary}; border-top: 2px solid ${primary}; border-bottom: none; margin-top: 8px; padding-top: 10px; }

    .comments { background: ${primary}; color: white; padding: 12px 16px; margin-top: 24px; }
    .comments h3 { font-size: ${fontSize.small}; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; }
    .comments p { font-size: ${fontSize.small}; line-height: 1.5; }

    .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 9pt; color: #9ca3af; }

    .status-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9pt; font-weight: 600; text-transform: uppercase; }
    .status-unpaid { background: #fef3c7; color: #92400e; }
    .status-paid_by_holdback { background: #ddd6fe; color: #5b21b6; }
    .status-holdback_remaining { background: #fde68a; color: #92400e; }
    .status-fully_paid { background: #d1fae5; color: #065f46; }
    .status-draft { background: #e5e7eb; color: #374151; }

    ${layoutStyles}
  </style>
</head>
<body>
  <div class="header">
    <div class="company-info">
      ${logoUrl && config.showLogo ? `<img src="${escapeHtml(logoUrl)}" alt="Company Logo" class="company-logo" />` : ''}
      <div>
        <h1>${escapeHtml(invoice.company_name || 'Company Name')}</h1>
        ${config.showCompanyDetails && config.headerStyle === 'full' ? `
          ${invoice.company_address ? `<p>${escapeHtml(invoice.company_address)}</p>` : ''}
          ${invoice.company_hst ? `<p>HST/GST: ${escapeHtml(invoice.company_hst)}</p>` : ''}
          ${invoice.company_phone ? `<p>Tel: ${escapeHtml(invoice.company_phone)}</p>` : ''}
          ${invoice.company_email ? `<p>Email: ${escapeHtml(invoice.company_email)}</p>` : ''}
          ${invoice.company_website ? `<p>Web: ${escapeHtml(invoice.company_website)}</p>` : ''}
        ` : ''}
      </div>
    </div>
    <div class="invoice-box">
      <h2>INVOICE</h2>
      <p><strong>Invoice #:</strong> ${escapeHtml(invoice.invoice_number)}</p>
      <p><strong>Date:</strong> ${escapeHtml(invoiceDate)}</p>
      <p><strong>Status:</strong> <span class="status-badge status-${status}">${statusLabel}</span></p>
    </div>
  </div>

  ${config.showClientDetails ? `
  <div class="bill-to">
    <h3>Bill To</h3>
    <p><strong>${escapeHtml(invoice.client_name)}</strong></p>
    ${invoice.client_contact ? `<p>${escapeHtml(invoice.client_contact)}</p>` : ''}
    ${invoice.client_address ? `<p>${escapeHtml(invoice.client_address)}</p>` : ''}
    ${invoice.client_email ? `<p>${escapeHtml(invoice.client_email)}</p>` : ''}
    ${invoice.client_phone ? `<p>${escapeHtml(invoice.client_phone)}</p>` : ''}
  </div>
  ` : ''}

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Description</th>
        <th class="num-col">Hours</th>
        <th class="num-col">Rate</th>
        <th class="num-col amount-col">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${lineItemsHTML || '<tr><td colspan="5" style="text-align: center; color: #9ca3af;">No line items</td></tr>'}
    </tbody>
  </table>

  <div class="totals-section">
    <div class="totals">
      <div class="totals-row subtotal">
        <span>Subtotal (${(Number(invoice.subtotal_hours) || 0).toFixed(1)} hrs):</span>
        <span>${formatCurrency((Number(invoice.net_amount) || 0) + (Number(invoice.holdback_amount) || 0))}</span>
      </div>
      ${hasHoldback ? `
      <div class="totals-row holdback">
        <span>Holdback (${escapeHtml(String(invoice.holdback_percentage ?? ''))}%):</span>
        <span>-${formatCurrency(Number(invoice.holdback_amount) || 0)}</span>
      </div>
      <div class="totals-row net">
        <span>Net Amount:</span>
        <span>${formatCurrency(Number(invoice.net_amount) || 0)}</span>
      </div>
      ` : ''}
      <div class="totals-row">
        <span>Tax (${escapeHtml(String(invoice.tax_rate ?? 13))}%):</span>
        <span>${formatCurrency(Number(invoice.tax_due) || 0)}</span>
      </div>
      <div class="totals-row total">
        <span>TOTAL PAYABLE:</span>
        <span>${formatCurrency(Number(invoice.total_payable) || 0)}</span>
      </div>
    </div>
  </div>

  ${invoice.comments ? `
  <div class="comments">
    <h3>Other Comments</h3>
    <p>${escapeMultiline(invoice.comments)}</p>
  </div>
  ` : ''}

  <div class="footer">
    <p>Generated on ${escapeHtml(new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' }))}</p>
  </div>
</body>
</html>`;
}
