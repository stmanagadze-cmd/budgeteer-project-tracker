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

    if (!invoiceId) {
      throw new Error('Invoice ID is required');
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Fetch invoice with all related data
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
      throw new Error('Invoice not found or access denied');
    }

    // Sort line items by order
    invoice.line_items = (invoice.line_items || []).sort((a: any, b: any) => a.item_order - b.item_order);

    // Get signed URLs for attachments
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

    // Generate HTML for PDF
    const html = generateInvoiceHTML(invoice, attachmentsWithUrls);

    return new Response(html, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html',
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

function generateInvoiceHTML(invoice: any, attachments: any[]): string {
  const lineItemsHTML = invoice.line_items.map((item: any, index: number) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${index + 1}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.hours.toFixed(1)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.price.toFixed(2)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">$${item.amount.toFixed(2)}</td>
    </tr>
  `).join('');

  const imagesHTML = attachments
    .filter(att => att.file_type.startsWith('image/') && att.signed_url)
    .map(att => `
      <div style="page-break-inside: avoid; margin-bottom: 20px;">
        <img 
          src="${att.signed_url}" 
          alt="${att.file_name}"
          style="max-width: 100%; height: auto; border: 1px solid #e5e7eb; border-radius: 8px; display: block; margin: 0 auto;"
          onclick="this.requestFullscreen()"
        />
        <p style="text-align: center; margin-top: 8px; font-size: 12px; color: #6b7280;">
          ${att.file_name}${att.description ? ' - ' + att.description : ''}
        </p>
      </div>
    `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Invoice ${invoice.invoice_number}</title>
  <style>
    @media print {
      @page { margin: 0.5in; }
      .no-print { display: none; }
      .page-break { page-break-before: always; }
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #fff;
    }
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #fb923c;
    }
    .company-info h1 {
      margin: 0 0 10px 0;
      color: #fb923c;
      font-size: 24px;
    }
    .company-info p {
      margin: 4px 0;
      font-size: 14px;
    }
    .invoice-details {
      text-align: right;
    }
    .invoice-details h2 {
      margin: 0 0 10px 0;
      font-size: 32px;
      color: #fb923c;
    }
    .invoice-details p {
      margin: 4px 0;
      font-size: 14px;
    }
    .bill-to {
      margin-bottom: 30px;
      padding: 20px;
      background: #f9fafb;
      border-radius: 8px;
    }
    .bill-to h3 {
      margin: 0 0 10px 0;
      color: #fb923c;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    th {
      background: #fb923c;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 600;
    }
    th:nth-child(3), th:nth-child(4), th:nth-child(5),
    td:nth-child(3), td:nth-child(4), td:nth-child(5) {
      text-align: right;
    }
    .totals {
      max-width: 400px;
      margin-left: auto;
      padding: 20px;
      background: #f9fafb;
      border-radius: 8px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .totals-row.total {
      font-size: 18px;
      font-weight: bold;
      border-top: 2px solid #fb923c;
      margin-top: 10px;
      padding-top: 10px;
    }
    .comments {
      margin-top: 30px;
      padding: 20px;
      background: #f9fafb;
      border-radius: 8px;
    }
    .comments h3 {
      margin: 0 0 10px 0;
      color: #fb923c;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
    }
    .images-section {
      margin-top: 40px;
      page-break-before: always;
    }
    .images-section h2 {
      color: #fb923c;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #fb923c;
    }
  </style>
</head>
<body>
  <!-- Invoice Page -->
  <div class="header">
    <div class="company-info">
      <h1>${invoice.company_name || 'Company Name'}</h1>
      ${invoice.company_address ? `<p>${invoice.company_address}</p>` : ''}
      ${invoice.company_hst ? `<p>HST: ${invoice.company_hst}</p>` : ''}
      ${invoice.company_phone ? `<p>Phone: ${invoice.company_phone}</p>` : ''}
      ${invoice.company_email ? `<p>Email: ${invoice.company_email}</p>` : ''}
      ${invoice.company_website ? `<p>Website: ${invoice.company_website}</p>` : ''}
    </div>
    <div class="invoice-details">
      <h2>INVOICE</h2>
      <p><strong>Invoice #:</strong> ${invoice.invoice_number}</p>
      <p><strong>Date:</strong> ${new Date(invoice.invoice_date).toLocaleDateString()}</p>
      <p><strong>Status:</strong> ${invoice.status.toUpperCase()}</p>
    </div>
  </div>

  <div class="bill-to">
    <h3>BILL TO</h3>
    <p><strong>${invoice.client_name}</strong></p>
    ${invoice.client_contact ? `<p>${invoice.client_contact}</p>` : ''}
    ${invoice.client_address ? `<p>${invoice.client_address}</p>` : ''}
    ${invoice.client_email ? `<p>${invoice.client_email}</p>` : ''}
    ${invoice.client_phone ? `<p>${invoice.client_phone}</p>` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 50px;">#</th>
        <th>Description</th>
        <th style="width: 80px;">HR</th>
        <th style="width: 100px;">Price</th>
        <th style="width: 120px;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${lineItemsHTML}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row">
      <span>Subtotal Hours:</span>
      <span>${invoice.subtotal_hours.toFixed(1)}</span>
    </div>
    <div class="totals-row">
      <span>Total KM:</span>
      <span>${invoice.total_km.toFixed(1)}</span>
    </div>
    <div class="totals-row">
      <span>Fuel Charge:</span>
      <span>$${invoice.fuel_charge.toFixed(2)}</span>
    </div>
    <div class="totals-row">
      <span>Net Amount:</span>
      <span>$${invoice.net_amount.toFixed(2)}</span>
    </div>
    <div class="totals-row">
      <span>Tax (${invoice.tax_rate}%):</span>
      <span>$${invoice.tax_due.toFixed(2)}</span>
    </div>
    <div class="totals-row total">
      <span>TOTAL PAYABLE:</span>
      <span>$${invoice.total_payable.toFixed(2)}</span>
    </div>
  </div>

  ${invoice.comments ? `
  <div class="comments">
    <h3>OTHER COMMENTS</h3>
    <p>${invoice.comments.replace(/\n/g, '<br>')}</p>
  </div>
  ` : ''}

  <div class="footer">
    <p>Generated on ${new Date().toLocaleString()}</p>
  </div>

  <!-- Attached Images -->
  ${attachments.filter(att => att.file_type.startsWith('image/')).length > 0 ? `
  <div class="images-section">
    <h2>Work Report - Attached Images</h2>
    ${imagesHTML}
  </div>
  ` : ''}
</body>
</html>
  `;
}
