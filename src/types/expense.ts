export interface ExpenseCategory {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
  updated_at: string;
  children?: ExpenseCategory[];
}

export interface Expense {
  id: string;
  user_id: string;
  category_id: string | null;
  company_id: string | null;
  amount: number;
  description: string;
  expense_date: string;
  receipt_path: string | null;
  created_at: string;
  updated_at: string;
  archived?: boolean;
  category?: ExpenseCategory;
}

