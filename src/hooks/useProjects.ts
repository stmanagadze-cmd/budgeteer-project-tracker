import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Project } from "@/types/project";
import { useToast } from "@/hooks/use-toast";

export const useProjects = (userId: string | undefined) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) {
      setProjects([]);
      setLoading(false);
      return;
    }

    fetchProjects();
    setupRealtimeSubscription();
  }, [userId]);

  const fetchProjects = async () => {
    try {
      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: true });

      if (projectsError) throw projectsError;

      const { data: periodsData, error: periodsError } = await supabase
        .from("work_periods")
        .select("*");

      if (periodsError) throw periodsError;

      const projectsWithPeriods = projectsData.map((project) => ({
        id: project.id,
        name: project.name,
        hourlySalary: Number(project.hourly_salary),
        targetBudget: Number(project.target_budget),
        workPeriods: periodsData
          .filter((period) => period.project_id === project.id)
          .map((period) => ({
            id: period.id,
            date: period.date,
            teamSize: period.team_size,
            daysWorked: Number(period.days_worked),
            hoursPerDay: Number(period.hours_per_day),
            workType: period.work_type,
            location: period.location,
            totalHours: Number(period.total_hours),
            periodCost: Number(period.period_cost),
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

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel("projects-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "projects",
        },
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
        },
        () => {
          fetchProjects();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const addProject = async (name: string): Promise<string | undefined> => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .insert([
          {
            user_id: userId,
            name,
            hourly_salary: 50,
            target_budget: 10000,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Project created",
        description: `${name} has been created.`,
      });

      return data?.id;
    } catch (error: any) {
      toast({
        title: "Error creating project",
        description: error.message,
        variant: "destructive",
      });
      return undefined;
    }
  };

  const updateProject = async (
    projectId: string,
    updates: { name?: string; hourly_salary?: number; target_budget?: number }
  ) => {
    try {
      const { error } = await supabase
        .from("projects")
        .update(updates)
        .eq("id", projectId);

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Error updating project",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteProject = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);

      if (error) throw error;

      toast({
        title: "Project deleted",
        description: "Project has been deleted.",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting project",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addWorkPeriod = async (projectId: string, period: any) => {
    try {
      const { error } = await supabase.from("work_periods").insert([
        {
          project_id: projectId,
          date: period.date,
          team_size: period.teamSize,
          days_worked: period.daysWorked,
          hours_per_day: period.hoursPerDay,
          work_type: period.workType,
          location: period.location,
          total_hours: period.totalHours,
          period_cost: period.periodCost,
        },
      ]);

      if (error) throw error;

      toast({
        title: "Work period added",
        description: "New work period has been recorded.",
      });
    } catch (error: any) {
      toast({
        title: "Error adding work period",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteWorkPeriod = async (periodId: string) => {
    try {
      const { error } = await supabase
        .from("work_periods")
        .delete()
        .eq("id", periodId);

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

  return {
    projects,
    loading,
    addProject,
    updateProject,
    deleteProject,
    addWorkPeriod,
    deleteWorkPeriod,
  };
};
