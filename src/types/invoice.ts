export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  item_order: number;
  description: string;
  hours: number;
  price: number;
  amount: number;
}

export interface InvoiceAttachment {
  id: string;
  invoice_id: string;
  file_path: string;
  file_name: string;
  file_type: string;
  description?: string;
}

export interface Invoice {
  id: string;
  user_id: string;
  project_id?: string;
  invoice_number: string;
  invoice_date: string;
  status: 'draft' | 'sent' | 'paid';
  
  // Company info
  company_name: string;
  company_address?: string;
  company_hst?: string;
  company_phone?: string;
  company_email?: string;
  company_website?: string;
  
  // Client info
  client_name: string;
  client_address?: string;
  client_contact?: string;
  client_email?: string;
  client_phone?: string;
  
  // Totals
  subtotal_hours: number;
  total_km: number;
  fuel_charge: number;
  net_amount: number;
  tax_rate: number;
  tax_due: number;
  total_payable: number;
  
  // Notes
  comments?: string;
  
  created_at: string;
  updated_at: string;
  
  // Relations
  line_items?: InvoiceLineItem[];
  attachments?: InvoiceAttachment[];
}
