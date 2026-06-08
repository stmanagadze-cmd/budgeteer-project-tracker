ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.work_periods ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_projects_archived ON public.projects(user_id, archived);
CREATE INDEX IF NOT EXISTS idx_work_periods_archived ON public.work_periods(project_id, archived);
CREATE INDEX IF NOT EXISTS idx_expenses_archived ON public.expenses(user_id, archived);