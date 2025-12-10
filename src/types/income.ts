export interface IncomeCategory {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Income {
  id: string;
  user_id: string;
  category_id: string | null;
  company_id: string | null;
  amount: number;
  description: string;
  income_date: string;
  created_at: string;
  updated_at: string;
  category?: IncomeCategory;
}
