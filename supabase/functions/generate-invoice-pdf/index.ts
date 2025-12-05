import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { invoiceId } = await req.json();
    console.log('Generating PDF for invoice:', invoiceId);

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

    const attachmentsWithUrls = await Promise.all(
      (invoice.attachments || []).map(async (attachment: any) => {
        const { data: urlData } = await supabaseClient.storage
          .from('invoice-attachments')
          .createSignedUrl(attachment.file_path, 3600);
        
        return {
          ...attachment,
          signed_url: urlData?.signedUrl || null,
        };
      })
    );

    const html = generateInvoiceHTML(invoice, attachmentsWithUrls);
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

function generateInvoiceHTML(invoice: any, attachments: any[]): string {
  const lineItemsHTML = invoice.line_items.map((item: any, index: number) => `
    <tr>
      <td>${index + 1}</td>
      <td class="desc-col">${item.description || ''}</td>
      <td class="num-col">${(item.hours || 0).toFixed(1)}</td>
      <td class="num-col">${formatCurrency(item.price || 0)}</td>
      <td class="num-col amount-col">${formatCurrency(item.amount || 0)}</td>
    </tr>
  `).join('');

  const imagesHTML = attachments
    .filter(att => att.file_type?.startsWith('image/') && att.signed_url)
    .map(att => `
      <div class="image-item">
        <img src="${att.signed_url}" alt="${att.file_name}" />
        <p class="image-caption">${att.file_name}${att.description ? ' - ' + att.description : ''}</p>
      </div>
    `).join('');

  const hasHoldback = invoice.holdback_enabled && invoice.holdback_amount > 0;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Invoice ${invoice.invoice_number}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    @page {
      size: Letter;
      margin: 0.5in;
    }
    
    @media print {
      html, body {
        width: 8.5in;
        height: 11in;
      }
      .page-break {
        page-break-before: always;
      }
      .no-print {
        display: none !important;
      }
    }
    
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 11pt;
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
      border-bottom: 3px solid #2563eb;
    }
    
    .company-info h1 {
      color: #2563eb;
      font-size: 18pt;
      font-weight: 700;
      margin-bottom: 8px;
    }
    
    .company-info p {
      font-size: 10pt;
      color: #4b5563;
      margin: 2px 0;
    }
    
    .invoice-box {
      border: 2px solid #e5e7eb;
      padding: 12px 16px;
      text-align: right;
      min-width: 180px;
    }
    
    .invoice-box h2 {
      color: #2563eb;
      font-size: 20pt;
      font-weight: 700;
      margin-bottom: 8px;
    }
    
    .invoice-box p {
      font-size: 10pt;
      margin: 3px 0;
    }
    
    .invoice-box strong {
      color: #374151;
    }
    
    .bill-to {
      background: #f3f4f6;
      padding: 16px;
      margin-bottom: 20px;
      border-left: 4px solid #2563eb;
    }
    
    .bill-to h3 {
      color: #2563eb;
      font-size: 11pt;
      font-weight: 600;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .bill-to p {
      font-size: 10pt;
      margin: 2px 0;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 10pt;
    }
    
    thead {
      background: #2563eb;
      color: white;
    }
    
    th {
      padding: 10px 8px;
      text-align: left;
      font-weight: 600;
      font-size: 10pt;
    }
    
    th.num-col, td.num-col {
      text-align: right;
      width: 70px;
    }
    
    th.amount-col, td.amount-col {
      width: 90px;
    }
    
    th:first-child {
      width: 30px;
    }
    
    td {
      padding: 10px 8px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: top;
    }
    
    td.desc-col {
      max-width: 300px;
      word-wrap: break-word;
    }
    
    tbody tr:nth-child(even) {
      background: #f9fafb;
    }
    
    .totals-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 20px;
    }
    
    .totals {
      width: 280px;
      font-size: 10pt;
    }
    
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .totals-row.subtotal {
      font-weight: 600;
    }
    
    .totals-row.holdback {
      color: #dc2626;
      background: #fef2f2;
      margin: 0 -8px;
      padding: 6px 8px;
    }
    
    .totals-row.net {
      font-weight: 600;
      background: #f0f9ff;
      margin: 0 -8px;
      padding: 6px 8px;
    }
    
    .totals-row.total {
      font-size: 12pt;
      font-weight: 700;
      color: #2563eb;
      border-top: 2px solid #2563eb;
      border-bottom: none;
      margin-top: 8px;
      padding-top: 10px;
    }
    
    .comments {
      background: #2563eb;
      color: white;
      padding: 12px 16px;
      margin-top: 24px;
    }
    
    .comments h3 {
      font-size: 10pt;
      font-weight: 600;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .comments p {
      font-size: 10pt;
      line-height: 1.5;
    }
    
    .footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 9pt;
      color: #9ca3af;
    }
    
    .images-section {
      page-break-before: always;
      padding-top: 20px;
    }
    
    .images-section h2 {
      color: #2563eb;
      font-size: 14pt;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #2563eb;
    }
    
    .images-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    
    .image-item {
      page-break-inside: avoid;
      text-align: center;
    }
    
    .image-item img {
      max-width: 100%;
      max-height: 300px;
      object-fit: contain;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
    }
    
    .image-caption {
      font-size: 9pt;
      color: #6b7280;
      margin-top: 6px;
    }
    
    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 9pt;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .status-unpaid { background: #fef3c7; color: #92400e; }
    .status-paid { background: #d1fae5; color: #065f46; }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-info">
      <h1>${invoice.company_name || 'Company Name'}</h1>
      ${invoice.company_address ? `<p>${invoice.company_address}</p>` : ''}
      ${invoice.company_hst ? `<p>HST/GST: ${invoice.company_hst}</p>` : ''}
      ${invoice.company_phone ? `<p>Tel: ${invoice.company_phone}</p>` : ''}
      ${invoice.company_email ? `<p>Email: ${invoice.company_email}</p>` : ''}
      ${invoice.company_website ? `<p>Web: ${invoice.company_website}</p>` : ''}
    </div>
    <div class="invoice-box">
      <h2>INVOICE</h2>
      <p><strong>Invoice #:</strong> ${invoice.invoice_number}</p>
      <p><strong>Date:</strong> ${new Date(invoice.invoice_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <p><strong>Status:</strong> <span class="status-badge status-${invoice.status}">${invoice.status}</span></p>
    </div>
  </div>

  <div class="bill-to">
    <h3>Bill To</h3>
    <p><strong>${invoice.client_name}</strong></p>
    ${invoice.client_contact ? `<p>${invoice.client_contact}</p>` : ''}
    ${invoice.client_address ? `<p>${invoice.client_address}</p>` : ''}
    ${invoice.client_email ? `<p>${invoice.client_email}</p>` : ''}
    ${invoice.client_phone ? `<p>${invoice.client_phone}</p>` : ''}
  </div>

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
        <span>Subtotal (${(invoice.subtotal_hours || 0).toFixed(1)} hrs):</span>
        <span>${formatCurrency(invoice.net_amount + (invoice.holdback_amount || 0))}</span>
      </div>
      ${hasHoldback ? `
      <div class="totals-row holdback">
        <span>Holdback (${invoice.holdback_percentage}%):</span>
        <span>-${formatCurrency(invoice.holdback_amount)}</span>
      </div>
      <div class="totals-row net">
        <span>Net Amount:</span>
        <span>${formatCurrency(invoice.net_amount)}</span>
      </div>
      ` : ''}
      <div class="totals-row">
        <span>Tax (${invoice.tax_rate || 13}%):</span>
        <span>${formatCurrency(invoice.tax_due)}</span>
      </div>
      <div class="totals-row total">
        <span>TOTAL PAYABLE:</span>
        <span>${formatCurrency(invoice.total_payable)}</span>
      </div>
    </div>
  </div>

  ${invoice.comments ? `
  <div class="comments">
    <h3>Other Comments</h3>
    <p>${invoice.comments.replace(/\n/g, '<br>')}</p>
  </div>
  ` : ''}

  <div class="footer">
    <p>Generated on ${new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}</p>
  </div>

  ${attachments.filter(att => att.file_type?.startsWith('image/')).length > 0 ? `
  <div class="images-section">
    <h2>Attached Documentation</h2>
    <div class="images-grid">
      ${imagesHTML}
    </div>
  </div>
  ` : ''}

  <script>
    // Auto-trigger print on load
    window.onafterprint = function() {
      // Optional: close window after print
    };
  </script>
</body>
</html>`;
}
