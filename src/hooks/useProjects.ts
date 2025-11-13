import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Project, WorkPeriod } from "@/types/project";
import { useToast } from "@/hooks/use-toast";

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

        const projectsWithPeriods: Project[] = (projectsData || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          hourlySalary: Number(p.hourly_salary),
          targetBudget: Number(p.target_budget),
          workPeriods: (periodsData || [])
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
              images: wp.images || [],
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
      const { data, error } = await (supabase as any)
        .from("projects")
        .insert({
          user_id: userId,
          name: project.name,
          hourly_salary: project.hourlySalary,
          target_budget: project.targetBudget,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Project created",
        description: `${project.name} has been created.`,
      });

      return data?.id;
    } catch (error: any) {
      toast({
        title: "Error creating project",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    try {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.hourlySalary !== undefined) updateData.hourly_salary = updates.hourlySalary;
      if (updates.targetBudget !== undefined) updateData.target_budget = updates.targetBudget;

      const { error } = await (supabase as any)
        .from("projects")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Error updating project",
        description: error.message,
        variant: "destructive",
      });
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
      const { error } = await (supabase as any).from("work_periods").insert({
        project_id: projectId,
        date: period.date,
        team_size: period.teamSize,
        days_worked: period.daysWorked,
        hours_per_day: period.hoursPerDay,
        work_type: period.workType,
        location: period.location,
        total_hours: period.totalHours,
        period_cost: period.periodCost,
        images: period.images || [],
      });

      if (error) throw error;

      toast({
        title: "Period added",
        description: "Work period has been added.",
      });
    } catch (error: any) {
      toast({
        title: "Error adding period",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateWorkPeriod = async (periodId: string, period: Partial<WorkPeriod>) => {
    try {
      const updateData: any = {};
      if (period.date !== undefined) updateData.date = period.date;
      if (period.teamSize !== undefined) updateData.team_size = period.teamSize;
      if (period.daysWorked !== undefined) updateData.days_worked = period.daysWorked;
      if (period.hoursPerDay !== undefined) updateData.hours_per_day = period.hoursPerDay;
      if (period.workType !== undefined) updateData.work_type = period.workType;
      if (period.location !== undefined) updateData.location = period.location;
      if (period.totalHours !== undefined) updateData.total_hours = period.totalHours;
      if (period.periodCost !== undefined) updateData.period_cost = period.periodCost;
      if (period.images !== undefined) updateData.images = period.images;

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
      toast({
        title: "Error updating period",
        description: error.message,
        variant: "destructive",
      });
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
