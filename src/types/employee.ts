export interface Employee {
  id: string;
  user_id: string;
  company_id: string | null;
  name: string;
  role: string | null;
  base_salary: number;
  created_at: string;
  updated_at: string;
}

export interface SalaryPayment {
  id: string;
  user_id: string;
  employee_id: string;
  company_id: string;
  expense_id: string | null;
  amount: number;
  payment_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  employee?: Employee;
}
