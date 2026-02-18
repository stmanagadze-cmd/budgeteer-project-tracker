export interface Contract {
  id: string;
  user_id: string;
  client_id: string | null;
  company_id: string | null;
  project_title: string;
  original_amount: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  change_orders?: ChangeOrder[];
  documents?: ContractDocument[];
}

export interface ChangeOrder {
  id: string;
  contract_id: string;
  description: string;
  amount: number;
  created_at: string;
}

export interface ContractDocument {
  id: string;
  contract_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  description: string | null;
  created_at: string;
}
