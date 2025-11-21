export interface Client {
  id: string;
  user_id: string;
  name: string;
  address?: string;
  next_invoice_number: number;
  created_at: string;
  updated_at: string;
}
