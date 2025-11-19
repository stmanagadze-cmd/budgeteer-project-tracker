import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Project, WorkPeriod } from "@/types/project";
import { useToast } from "@/hooks/use-toast";
import { workPeriodSchema, projectSchema } from "@/lib/validation";
import { ZodError } from "zod";

export const useProjects = (userId: string | undefined) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;

    const fetchProjects = async () => {
      try {
        const { data: projectsData, error: projectsError } = await (supabase as any)
          .from("projects")
          .select("*")
          .eq("user_id", userId);

        if (projectsError) throw projectsError;

        const { data: periodsData, error: periodsError } = await (supabase as any)
          .from("work_periods")
          .select("*");

        if (periodsError) throw periodsError;

        // Generate signed URLs for images in private bucket
        const periodsWithSignedUrls = await Promise.all(
          (periodsData || []).map(async (wp: any) => {
            const signedImages = await Promise.all(
              (wp.images || []).map(async (imageUrl: string) => {
                // Extract the file path from the stored path or URL
                const urlParts = imageUrl.split('/');
                const bucketIndex = urlParts.findIndex(part => part === 'work-period-images');
                if (bucketIndex === -1) return imageUrl;
                
                const filePath = urlParts.slice(bucketIndex + 1).join('/');
                
                const { data, error } = await supabase.storage
                  .from('work-period-images')
                  .createSignedUrl(filePath, 3600); // 1 hour expiry
                
                return error ? imageUrl : data.signedUrl;
              })
            );
            
            return { ...wp, signedImages };
          })
        );

        const projectsWithPeriods: Project[] = (projectsData || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          hourlySalary: Number(p.hourly_salary),
          targetBudget: Number(p.target_budget),
          workPeriods: periodsWithSignedUrls
            .filter((wp: any) => wp.project_id === p.id)
            .map((wp: any) => ({
              id: wp.id,
              date: wp.date,
              teamSize: wp.team_size,
              daysWorked: Number(wp.days_worked),
              hoursPerDay: Number(wp.hours_per_day),
              workType: wp.work_type,
              location: wp.location,
              totalHours: Number(wp.total_hours),
              periodCost: Number(wp.period_cost),
              images: wp.signedImages || [],
            })),
        }));

        setProjects(projectsWithPeriods);
      } catch (error: any) {
        toast({
          title: "Error loading projects",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();

    const projectsChannel = supabase
      .channel("projects-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "projects",
        } as any,
        () => {
          fetchProjects();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "work_periods",
        } as any,
        () => {
          fetchProjects();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(projectsChannel);
    };
  }, [userId, toast]);

  const addProject = async (project: Omit<Project, "id" | "workPeriods">) => {
    if (!userId) return;

    try {
      // Validate input
      const validatedProject = projectSchema.parse({
        name: project.name,
        hourlySalary: project.hourlySalary,
        targetBudget: project.targetBudget,
      });

      const { data, error } = await (supabase as any)
        .from("projects")
        .insert({
          user_id: userId,
          name: validatedProject.name,
          hourly_salary: validatedProject.hourlySalary,
          target_budget: validatedProject.targetBudget,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Project created",
        description: `${validatedProject.name} has been created.`,
      });

      return data?.id;
    } catch (error: any) {
      if (error instanceof ZodError) {
        toast({
          title: "Validation error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error creating project",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    try {
      // Validate only the fields being updated
      const validatedUpdates = projectSchema.partial().parse({
        name: updates.name,
        hourlySalary: updates.hourlySalary,
        targetBudget: updates.targetBudget,
      });

      const updateData: any = {};
      if (validatedUpdates.name !== undefined) updateData.name = validatedUpdates.name;
      if (validatedUpdates.hourlySalary !== undefined) updateData.hourly_salary = validatedUpdates.hourlySalary;
      if (validatedUpdates.targetBudget !== undefined) updateData.target_budget = validatedUpdates.targetBudget;

      const { error } = await (supabase as any)
        .from("projects")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      // If hourly salary was updated, recalculate all work period costs
      if (validatedUpdates.hourlySalary !== undefined) {
        const { data: workPeriods, error: fetchError } = await (supabase as any)
          .from("work_periods")
          .select("id, days_worked, hours_per_day, team_size")
          .eq("project_id", id);

        if (fetchError) throw fetchError;

        if (workPeriods && workPeriods.length > 0) {
          // Update each work period with recalculated cost
          const updates = workPeriods.map((period: any) => {
            const newCost = Number(period.days_worked) * Number(period.hours_per_day) * period.team_size * validatedUpdates.hourlySalary;
            return supabase
              .from("work_periods")
              .update({ period_cost: newCost })
              .eq("id", period.id);
          });

          await Promise.all(updates);

          toast({
            title: "Project updated",
            description: "Hourly rate and all work period costs have been recalculated.",
          });
        }
      }
    } catch (error: any) {
      if (error instanceof ZodError) {
        toast({
          title: "Validation error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error updating project",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  const deleteProject = async (id: string) => {
    try {
      const { error } = await (supabase as any).from("projects").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Project deleted",
        description: "Project has been removed.",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting project",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addWorkPeriod = async (projectId: string, period: Omit<WorkPeriod, "id">) => {
    try {
      // Validate input
      const validatedPeriod = workPeriodSchema.parse(period);

      const { error } = await (supabase as any).from("work_periods").insert({
        project_id: projectId,
        date: validatedPeriod.date,
        team_size: validatedPeriod.teamSize,
        days_worked: validatedPeriod.daysWorked,
        hours_per_day: validatedPeriod.hoursPerDay,
        work_type: validatedPeriod.workType,
        location: validatedPeriod.location,
        total_hours: validatedPeriod.totalHours,
        period_cost: validatedPeriod.periodCost,
        images: validatedPeriod.images || [],
      });

      if (error) throw error;

      toast({
        title: "Period added",
        description: "Work period has been added.",
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        toast({
          title: "Validation error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error adding period",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  const updateWorkPeriod = async (periodId: string, period: Partial<WorkPeriod>) => {
    try {
      // Validate only the fields being updated
      const validatedPeriod = workPeriodSchema.partial().parse(period);

      const updateData: any = {};
      if (validatedPeriod.date !== undefined) updateData.date = validatedPeriod.date;
      if (validatedPeriod.teamSize !== undefined) updateData.team_size = validatedPeriod.teamSize;
      if (validatedPeriod.daysWorked !== undefined) updateData.days_worked = validatedPeriod.daysWorked;
      if (validatedPeriod.hoursPerDay !== undefined) updateData.hours_per_day = validatedPeriod.hoursPerDay;
      if (validatedPeriod.workType !== undefined) updateData.work_type = validatedPeriod.workType;
      if (validatedPeriod.location !== undefined) updateData.location = validatedPeriod.location;
      if (validatedPeriod.totalHours !== undefined) updateData.total_hours = validatedPeriod.totalHours;
      if (validatedPeriod.periodCost !== undefined) updateData.period_cost = validatedPeriod.periodCost;
      if (validatedPeriod.images !== undefined) updateData.images = validatedPeriod.images;

      const { error } = await (supabase as any)
        .from("work_periods")
        .update(updateData)
        .eq("id", periodId);

      if (error) throw error;

      toast({
        title: "Period updated",
        description: "Work period has been updated.",
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        toast({
          title: "Validation error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error updating period",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  const deleteWorkPeriod = async (periodId: string) => {
    try {
      // First, get the images to delete
      const { data: period } = await (supabase as any)
        .from("work_periods")
        .select("images")
        .eq("id", periodId)
        .single();

      // Delete images from storage if they exist
      if (period?.images && period.images.length > 0) {
        const imagePaths = period.images.map((url: string) => {
          const urlParts = url.split('/');
          return `${periodId}/${urlParts[urlParts.length - 1]}`;
        });
        
        await supabase.storage
          .from("work-period-images")
          .remove(imagePaths);
      }

      const { error } = await (supabase as any).from("work_periods").delete().eq("id", periodId);

      if (error) throw error;

      toast({
        title: "Period deleted",
        description: "Work period has been removed.",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting period",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const uploadWorkPeriodImage = async (periodId: string, file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${periodId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("work-period-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Store the file path instead of public URL since bucket is now private
      // The file path will be converted to signed URL when fetching
      const { data: { publicUrl } } = supabase.storage
        .from("work-period-images")
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      toast({
        title: "Error uploading image",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteWorkPeriodImage = async (periodId: string, imageUrl: string) => {
    try {
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `${periodId}/${fileName}`;

      const { error } = await supabase.storage
        .from("work-period-images")
        .remove([filePath]);

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Error deleting image",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return {
    projects,
    loading,
    addProject,
    updateProject,
    deleteProject,
    addWorkPeriod,
    updateWorkPeriod,
    deleteWorkPeriod,
    uploadWorkPeriodImage,
    deleteWorkPeriodImage,
  };
};
