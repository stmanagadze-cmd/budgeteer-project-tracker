-- Create income_categories table
CREATE TABLE public.income_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#10B981',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on income_categories
ALTER TABLE public.income_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies for income_categories
CREATE POLICY "Users can view their own income categories" ON public.income_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own income categories" ON public.income_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own income categories" ON public.income_categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own income categories" ON public.income_categories FOR DELETE USING (auth.uid() = user_id);

-- Create income table for manual income entries
CREATE TABLE public.income (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_id UUID REFERENCES public.income_categories(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  income_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on income
ALTER TABLE public.income ENABLE ROW LEVEL SECURITY;

-- RLS policies for income
CREATE POLICY "Users can view their own income" ON public.income FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own income" ON public.income FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own income" ON public.income FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own income" ON public.income FOR DELETE USING (auth.uid() = user_id);

-- Create employees table
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  base_salary NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on employees
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- RLS policies for employees
CREATE POLICY "Users can view their own employees" ON public.employees FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own employees" ON public.employees FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own employees" ON public.employees FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own employees" ON public.employees FOR DELETE USING (auth.uid() = user_id);

-- Create salary_payments table
CREATE TABLE public.salary_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on salary_payments
ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for salary_payments
CREATE POLICY "Users can view their own salary payments" ON public.salary_payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own salary payments" ON public.salary_payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own salary payments" ON public.salary_payments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own salary payments" ON public.salary_payments FOR DELETE USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_income_categories_updated_at BEFORE UPDATE ON public.income_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_income_updated_at BEFORE UPDATE ON public.income FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_salary_payments_updated_at BEFORE UPDATE ON public.salary_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for income and salary_payments
ALTER PUBLICATION supabase_realtime ADD TABLE public.income;
ALTER PUBLICATION supabase_realtime ADD TABLE public.salary_payments;