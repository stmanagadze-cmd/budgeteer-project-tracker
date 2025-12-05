-- Create expense categories table with hierarchical structure
CREATE TABLE public.expense_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  parent_id UUID REFERENCES public.expense_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6B7280',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- RLS policies for expense_categories
CREATE POLICY "Users can view their own expense categories"
ON public.expense_categories FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own expense categories"
ON public.expense_categories FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expense categories"
ON public.expense_categories FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expense categories"
ON public.expense_categories FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for expenses
CREATE POLICY "Users can view their own expenses"
ON public.expenses FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own expenses"
ON public.expenses FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expenses"
ON public.expenses FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expenses"
ON public.expenses FOR DELETE
USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_expense_categories_updated_at
BEFORE UPDATE ON public.expense_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for expenses
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;