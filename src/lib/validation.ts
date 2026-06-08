import { z } from "zod";

export const workPeriodSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  teamSize: z.number().int().min(1, "Team size must be at least 1").max(1000, "Team size cannot exceed 1000"),
  daysWorked: z.number().min(0.5, "Days worked must be at least 0.5").max(365, "Days worked cannot exceed 365"),
  hoursPerDay: z.number().int().min(1, "Hours per day must be at least 1").max(24, "Hours per day cannot exceed 24"),
  workType: z.string().trim().min(1, "Work type is required").max(100, "Work type cannot exceed 100 characters"),
  location: z.string().trim().min(1, "Location is required").max(100, "Location cannot exceed 100 characters"),
  totalHours: z.number().min(0),
  periodCost: z.number().min(0),
  images: z.array(z.string()).optional(),
});

export const projectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(200, "Project name cannot exceed 200 characters"),
  hourlySalary: z.number().min(0, "Hourly salary must be positive").max(10000, "Hourly salary seems unreasonably high"),
  targetBudget: z.number().min(0, "Target budget must be positive").max(10000000, "Target budget seems unreasonably high"),
  categoryId: z.string().uuid().nullable().optional(),
});

export const projectCategorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required").max(60, "Category name too long"),
});

export const pdfReportSchema = z.object({
  project: z.object({
    id: z.string().uuid("Invalid project ID"),
    name: z.string().trim().min(1).max(200),
    hourlySalary: z.number().min(0).max(10000),
    targetBudget: z.number().min(0).max(10000000),
    workPeriods: z.array(workPeriodSchema),
  }),
});

export type WorkPeriodInput = z.infer<typeof workPeriodSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
export type PDFReportInput = z.infer<typeof pdfReportSchema>;
