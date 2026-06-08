
CREATE TABLE public.project_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_categories TO authenticated;
GRANT ALL ON public.project_categories TO service_role;

ALTER TABLE public.project_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own categories"
  ON public.project_categories FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories"
  ON public.project_categories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
  ON public.project_categories FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
  ON public.project_categories FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_project_categories_updated_at
  BEFORE UPDATE ON public.project_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_project_categories_user_id ON public.project_categories(user_id);

ALTER TABLE public.projects
  ADD COLUMN category_id UUID REFERENCES public.project_categories(id) ON DELETE SET NULL;

CREATE INDEX idx_projects_category_id ON public.projects(category_id);
