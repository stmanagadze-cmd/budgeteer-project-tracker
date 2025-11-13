import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface WorkPeriod {
  id: string;
  date: string;
  teamSize: number;
  daysWorked: number;
  hoursPerDay: number;
  workType: string;
  location: string;
  totalHours: number;
  periodCost: number;
}

export interface Project {
  id: string;
  name: string;
  hourlySalary: number;
  targetBudget: number;
  workPeriods: WorkPeriod[];
}

export const useProjects = (userId: string | undefined) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchProjects = async () => {
      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", userId);

      if (projectsError) {
        toast({
          title: "Error loading projects",
          description: projectsError.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { data: periodsData, error: periodsError } = await supabase
        .from("work_periods")
        .select("*");

      if (periodsError) {
        toast({
          title: "Error loading work periods",
          description: periodsError.message,
          variant: "destructive",
        });
      }

      const projectsWithPeriods = projectsData.map((project) => ({
        id: project.id,
        name: project.name,
        hourlySalary: Number(project.hourly_salary),
        targetBudget: Number(project.target_budget),
        workPeriods: periodsData
          ?.filter((period) => period.project_id === project.id)
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
          })) || [],
      }));

      setProjects(projectsWithPeriods);
      setLoading(false);
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
          filter: `user_id=eq.${userId}`,
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
      supabase.removeChannel(projectsChannel);
    };
  }, [userId, toast]);

  const addProject = async (name: string, hourlySalary: number, targetBudget: number) => {
    if (!userId) return null;

    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: userId,
        name,
        hourly_salary: hourlySalary,
        target_budget: targetBudget,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error creating project",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }

    toast({
      title: "Project created",
      description: `${name} has been created.`,
    });

    return data.id;
  };

  const updateProject = async (
    projectId: string,
    updates: { name?: string; hourly_salary?: number; target_budget?: number }
  ) => {
    const { error } = await supabase
      .from("projects")
      .update(updates)
      .eq("id", projectId);

    if (error) {
      toast({
        title: "Error updating project",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteProject = async (projectId: string) => {
    const { error } = await supabase.from("projects").delete().eq("id", projectId);

    if (error) {
      toast({
        title: "Error deleting project",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }

    toast({
      title: "Project deleted",
      description: "Project has been deleted.",
    });

    return true;
  };

  const addWorkPeriod = async (projectId: string, period: Omit<WorkPeriod, "id">) => {
    const { error } = await supabase.from("work_periods").insert({
      project_id: projectId,
      date: period.date,
      team_size: period.teamSize,
      days_worked: period.daysWorked,
      hours_per_day: period.hoursPerDay,
      work_type: period.workType,
      location: period.location,
      total_hours: period.totalHours,
      period_cost: period.periodCost,
    });

    if (error) {
      toast({
        title: "Error adding work period",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }

    toast({
      title: "Work period added",
      description: "Work period has been added successfully.",
    });

    return true;
  };

  const deleteWorkPeriod = async (periodId: string) => {
    const { error } = await supabase.from("work_periods").delete().eq("id", periodId);

    if (error) {
      toast({
        title: "Error deleting work period",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }

    toast({
      title: "Period deleted",
      description: "Work period has been removed.",
    });

    return true;
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
