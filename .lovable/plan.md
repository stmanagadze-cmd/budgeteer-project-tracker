## Plan: Budgeter Enhancements

### 1. Project Categories (DB + UI)
- **Migration**: new `project_categories` table (`id`, `user_id`, `name`, `created_at`, `updated_at`) with RLS + GRANTs. Add nullable `category_id uuid` column on `projects` referencing `project_categories(id) ON DELETE SET NULL`.
- **Hook**: new `useProjectCategories.ts` (list / create / rename / delete). Extend `useProjects` to load + persist `categoryId` and to expose it on the `Project` type.
- **UI**: 
  - New `ManageCategoriesDialog` (button in `ProjectTabs` toolbar) for create / rename / delete categories.
  - When creating/renaming projects, allow selecting a category (extend prompt-based flow with a small dialog: name + category select).

### 2. "My Projects" list on the Budgeteer page
- New `MyProjectsList` component shown above `ProjectSettings`. Cards display **name**, **creation date** (MMM DD, YYYY), and **category label**.
- Projects grouped under category headers; uncategorized projects under an "Uncategorized" section.
- Clicking a card selects it as the active project.

### 3. Period Edit Popup — attached photos
- Inside `EditWorkPeriodForm` (in `WorkPeriods.tsx`):
  - Render thumbnails of `period.images` using existing `WorkPeriodImage`.
  - Each thumbnail has a delete button → confirmation `AlertDialog` → call `onDeleteImage`.
  - Add an "Upload photos" file input that calls `onUploadImage` for each selected file and refreshes the local view.

### 4. Attach Photos on Add — new period
- Add a file input to the "Add New Period" form. Selected `File[]` are kept in local state.
- On submit: after `onAddPeriod` resolves with the new period ID, upload each file via `onUploadImage(newPeriodId, file)`.
- Refactor `addWorkPeriod` in `useProjects.ts` to **return the new period id** so the component can attach files.

### 5. Rows-per-page selector
- Add pagination to the periods `VirtualTable` consumer in `WorkPeriods.tsx`.
- "Rows per page" `Select` with options **10 / 20 / 50 / 100** (default **20**), persisted in `localStorage` under `budgeteer.periodsPageSize`.
- Slice `sortedWorkPeriods` by current page + size; add Prev / Next + page indicator below the table. Page resets to 1 when size or filter changes.

### Technical notes
- All DB changes go through one migration; no edits to `supabase/config.toml` or auto-generated client files.
- Keep existing styling tokens; reuse shadcn `Card`, `Select`, `Dialog`, `AlertDialog`.
- `onAddPeriod` signature changes to `Promise<string | undefined>` (id of new period). Update `Index.tsx` accordingly.

### Files touched
- New: `supabase/migrations/<timestamp>_project_categories.sql`, `src/hooks/useProjectCategories.ts`, `src/components/MyProjectsList.tsx`, `src/components/ManageCategoriesDialog.tsx`.
- Edited: `src/types/project.ts`, `src/hooks/useProjects.ts`, `src/components/ProjectTabs.tsx`, `src/components/WorkPeriods.tsx`, `src/pages/Index.tsx`.
