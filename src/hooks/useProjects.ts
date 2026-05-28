import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Project, WorkPeriod } from "@/types/project";
import { useToast } from "@/hooks/use-toast";
import { workPeriodSchema, projectSchema } from "@/lib/validation";
import { ZodError } from "zod";

export const useProjects = (userId: string | undefined) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchProjects = useCallback(async () => {
    if (!userId) return;

    try {
      // Step 1: fetch only this user's projects
      const { data: projectsData, error: projectsErr } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (projectsErr) throw projectsErr;

      const ownedProjects = projectsData || [];
      const projectIds = ownedProjects.map((p) => p.id);

      // Step 2: fetch work periods scoped to those project ids
      let periodsData: any[] = [];
      if (projectIds.length > 0) {
        const { data: wpData, error: wpErr } = await supabase
          .from("work_periods")
          .select("*")
          .in("project_id", projectIds);

        if (wpErr) throw wpErr;
        periodsData = wpData || [];
      }

      const periodsMap = new Map<string, WorkPeriod[]>();
      periodsData.forEach((wp) => {
        const list = periodsMap.get(wp.project_id) || [];
        list.push({
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
        });
        periodsMap.set(wp.project_id, list);
      });

      const projectsWithPeriods: Project[] = ownedProjects.map((p) => ({
        id: p.id,
        name: p.name,
        hourlySalary: Number(p.hourly_salary),
        targetBudget: Number(p.target_budget),
        workPeriods: periodsMap.get(p.id) || [],
        createdAt: p.created_at,
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
  }, [userId, toast]);

  useEffect(() => {
    if (!userId) return;

    fetchProjects();

    const debouncedFetch = () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(fetchProjects, 500);
    };

    const projectsChannel = supabase
      .channel("projects-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, debouncedFetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "work_periods" }, debouncedFetch)
      .subscribe();

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      supabase.removeChannel(projectsChannel);
    };
  }, [userId, fetchProjects]);

  const addProject = useCallback(async (project: Omit<Project, "id" | "workPeriods" | "createdAt">) => {
    if (!userId) return;

    try {
      const validatedProject = projectSchema.parse(project);

      // Optimistic update - insert at top with current timestamp
      const tempId = `temp-${Date.now()}`;
      const now = new Date().toISOString();
      const newProject: Project = {
        id: tempId,
        name: validatedProject.name,
        hourlySalary: validatedProject.hourlySalary,
        targetBudget: validatedProject.targetBudget,
        workPeriods: [],
        createdAt: now,
      };
      
      // Insert at top (newest first)
      setProjects(prev => [newProject, ...prev]);

      const { data, error } = await supabase
        .from("projects")
        .insert({
          user_id: userId,
          name: validatedProject.name,
          hourly_salary: validatedProject.hourlySalary,
          target_budget: validatedProject.targetBudget,
        })
        .select()
        .single();

      if (error) {
        // Rollback on error
        setProjects(prev => prev.filter(p => p.id !== tempId));
        throw error;
      }

      // Replace temp with real ID and actual createdAt
      setProjects(prev => prev.map(p => 
        p.id === tempId ? { ...p, id: data.id, createdAt: data.created_at } : p
      ));

      toast({ title: "Project created", description: `${validatedProject.name} has been created.` });
      return data.id;
    } catch (error: any) {
      const message = error instanceof ZodError ? error.errors[0].message : error.message;
      toast({ title: "Error creating project", description: message, variant: "destructive" });
    }
  }, [userId, toast]);

  const updateProject = useCallback(async (id: string, updates: Partial<Project>) => {
    try {
      const validatedUpdates = projectSchema.partial().parse(updates);
      const updateData: Record<string, any> = {};
      
      if (validatedUpdates.name !== undefined) updateData.name = validatedUpdates.name;
      if (validatedUpdates.hourlySalary !== undefined) updateData.hourly_salary = validatedUpdates.hourlySalary;
      if (validatedUpdates.targetBudget !== undefined) updateData.target_budget = validatedUpdates.targetBudget;

      // Optimistic update
      const oldProjects = projects;
      setProjects(prev => prev.map(p => 
        p.id === id ? { ...p, ...validatedUpdates } : p
      ));

      const { error } = await supabase.from("projects").update(updateData as any).eq("id", id);

      if (error) {
        setProjects(oldProjects);
        throw error;
      }

      // Batch update work period costs if hourly salary changed
      if (validatedUpdates.hourlySalary !== undefined) {
        const { data: workPeriods } = await supabase
          .from("work_periods")
          .select("id, days_worked, hours_per_day, team_size")
          .eq("project_id", id);

        if (workPeriods?.length) {
          // Calculate all new costs in memory
          const batchUpdates = workPeriods.map(period => ({
            id: period.id,
            period_cost: Number(period.days_worked) * Number(period.hours_per_day) * period.team_size * validatedUpdates.hourlySalary!
          }));

          // Batch update using Promise.all
          await Promise.all(
            batchUpdates.map(u => 
              supabase.from("work_periods").update({ period_cost: u.period_cost }).eq("id", u.id)
            )
          );

          // Update local state
          setProjects(prev => prev.map(p => 
            p.id === id ? {
              ...p,
              workPeriods: p.workPeriods.map(wp => {
                const update = batchUpdates.find(u => u.id === wp.id);
                return update ? { ...wp, periodCost: update.period_cost } : wp;
              })
            } : p
          ));

          toast({ title: "Project updated", description: "Hourly rate and work period costs recalculated." });
          return;
        }
      }
    } catch (error: any) {
      const message = error instanceof ZodError ? error.errors[0].message : error.message;
      toast({ title: "Error updating project", description: message, variant: "destructive" });
    }
  }, [projects, toast]);

  const deleteProject = useCallback(async (id: string) => {
    try {
      // Optimistic delete
      const oldProjects = projects;
      setProjects(prev => prev.filter(p => p.id !== id));

      const { error } = await supabase.from("projects").delete().eq("id", id);

      if (error) {
        setProjects(oldProjects);
        throw error;
      }

      toast({ title: "Project deleted", description: "Project has been removed." });
    } catch (error: any) {
      toast({ title: "Error deleting project", description: error.message, variant: "destructive" });
    }
  }, [projects, toast]);

  const addWorkPeriod = useCallback(async (projectId: string, period: Omit<WorkPeriod, "id">) => {
    try {
      const validatedPeriod = workPeriodSchema.parse(period);

      // Generate temp ID for optimistic update
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newPeriod: WorkPeriod = {
        id: tempId,
        date: validatedPeriod.date,
        teamSize: validatedPeriod.teamSize,
        daysWorked: validatedPeriod.daysWorked,
        hoursPerDay: validatedPeriod.hoursPerDay,
        workType: validatedPeriod.workType,
        location: validatedPeriod.location,
        totalHours: validatedPeriod.totalHours,
        periodCost: validatedPeriod.periodCost,
        images: validatedPeriod.images || [],
      };

      // Optimistic update - use functional state to avoid stale closures
      setProjects(prev => prev.map(p => 
        p.id === projectId 
          ? { ...p, workPeriods: [...p.workPeriods, newPeriod] }
          : p
      ));

      const { data, error } = await supabase.from("work_periods").insert({
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
      }).select().single();

      if (error) {
        // Rollback on error
        setProjects(prev => prev.map(p => 
          p.id === projectId 
            ? { ...p, workPeriods: p.workPeriods.filter(wp => wp.id !== tempId) }
            : p
        ));
        throw error;
      }

      // Replace temp ID with real ID
      setProjects(prev => prev.map(p => 
        p.id === projectId 
          ? { ...p, workPeriods: p.workPeriods.map(wp => 
              wp.id === tempId ? { ...wp, id: data.id } : wp
            )}
          : p
      ));

      toast({ title: "Period added", description: "Work period has been added." });
    } catch (error: any) {
      const message = error instanceof ZodError ? error.errors[0].message : error.message;
      toast({ title: "Error adding period", description: message, variant: "destructive" });
    }
  }, [toast]);

  const updateWorkPeriod = useCallback(async (periodId: string, period: Partial<WorkPeriod>) => {
    try {
      const validatedPeriod = workPeriodSchema.partial().parse(period);
      const updateData: Record<string, any> = {};
      
      if (validatedPeriod.date !== undefined) updateData.date = validatedPeriod.date;
      if (validatedPeriod.teamSize !== undefined) updateData.team_size = validatedPeriod.teamSize;
      if (validatedPeriod.daysWorked !== undefined) updateData.days_worked = validatedPeriod.daysWorked;
      if (validatedPeriod.hoursPerDay !== undefined) updateData.hours_per_day = validatedPeriod.hoursPerDay;
      if (validatedPeriod.workType !== undefined) updateData.work_type = validatedPeriod.workType;
      if (validatedPeriod.location !== undefined) updateData.location = validatedPeriod.location;
      if (validatedPeriod.totalHours !== undefined) updateData.total_hours = validatedPeriod.totalHours;
      if (validatedPeriod.periodCost !== undefined) updateData.period_cost = validatedPeriod.periodCost;
      if (validatedPeriod.images !== undefined) updateData.images = validatedPeriod.images;

      const { error } = await supabase.from("work_periods").update(updateData).eq("id", periodId);

      if (error) throw error;
      toast({ title: "Period updated", description: "Work period has been updated." });
    } catch (error: any) {
      const message = error instanceof ZodError ? error.errors[0].message : error.message;
      toast({ title: "Error updating period", description: message, variant: "destructive" });
    }
  }, [toast]);

  const deleteWorkPeriod = useCallback(async (periodId: string) => {
    try {
      // Get images first
      const { data: period } = await supabase
        .from("work_periods")
        .select("images")
        .eq("id", periodId)
        .maybeSingle();

      // Delete images from storage in batch
      if (period?.images?.length) {
        const imagePaths = period.images.map((url: string) => {
          const urlParts = url.split('/');
          return `${periodId}/${urlParts[urlParts.length - 1]}`;
        });
        await supabase.storage.from("work-period-images").remove(imagePaths);
      }

      const { error } = await supabase.from("work_periods").delete().eq("id", periodId);

      if (error) throw error;
      toast({ title: "Period deleted", description: "Work period has been removed." });
    } catch (error: any) {
      toast({ title: "Error deleting period", description: error.message, variant: "destructive" });
    }
  }, [toast]);

  const uploadWorkPeriodImage = useCallback(async (workPeriodId: string, file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const validExtensions = ['png', 'jpg', 'jpeg'];
      
      if (!fileExt || !validExtensions.includes(fileExt)) {
        throw new Error('Invalid file type. Only PNG, JPG, and JPEG are allowed.');
      }

      const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      const filePath = `${workPeriodId}/${uniqueId}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('work-period-images')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: workPeriodData } = await supabase
        .from('work_periods')
        .select('images')
        .eq('id', workPeriodId)
        .maybeSingle();

      const fullPath = `work-period-images/${filePath}`;
      const updatedImages = [...(workPeriodData?.images || []), fullPath];

      const { error: updateError } = await supabase
        .from('work_periods')
        .update({ images: updatedImages })
        .eq('id', workPeriodId);

      if (updateError) throw updateError;

      // Optimistic local update
      setProjects(prev => prev.map(project => ({
        ...project,
        workPeriods: project.workPeriods.map(period =>
          period.id === workPeriodId ? { ...period, images: updatedImages } : period
        )
      })));

      return fullPath;
    } catch (error: any) {
      toast({ title: "Error uploading image", description: error.message, variant: "destructive" });
      return null;
    }
  }, [toast]);

  const deleteWorkPeriodImage = useCallback(async (periodId: string, imageUrl: string) => {
    try {
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `${periodId}/${fileName}`;

      const { error } = await supabase.storage.from("work-period-images").remove([filePath]);
      if (error) throw error;
    } catch (error: any) {
      toast({ title: "Error deleting image", description: error.message, variant: "destructive" });
    }
  }, [toast]);

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
