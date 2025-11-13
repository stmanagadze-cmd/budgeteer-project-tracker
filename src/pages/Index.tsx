import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import ProjectTabs from "@/components/ProjectTabs";
import ProjectSettings from "@/components/ProjectSettings";
import KPICards from "@/components/KPICards";
import BudgetCharts from "@/components/BudgetCharts";
import WorkPeriods from "@/components/WorkPeriods";
import SettingsSidebar from "@/components/SettingsSidebar";
import { WorkPeriod } from "@/types/project";
import { useProjects } from "@/hooks/useProjects";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Settings, LogOut } from "lucide-react";

const Index = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const { projects, loading: projectsLoading, addProject, updateProject, deleteProject, addWorkPeriod, deleteWorkPeriod } = useProjects(userId);
  const [activeProjectId, setActiveProjectId] = useState<string>("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [visibleCards, setVisibleCards] = useState({
    totalHours: true,
    totalAccumulated: true,
    targetBudget: true,
    remaining: true,
    progress: true,
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
      } else {
        navigate("/auth");
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
      } else {
        navigate("/auth");
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (projects.length > 0 && !activeProjectId) {
      setActiveProjectId(projects[0].id);
    }
  }, [projects, activeProjectId]);

  const activeProject = projects.find((p) => p.id === activeProjectId);

  const handleAddProject = async () => {
    const name = `New Project ${projects.length + 1}`;
    const newProjectId = await addProject(name, 50, 10000);
    if (newProjectId) {
      setActiveProjectId(newProjectId);
    }
  };

  const handleRenameProject = async (id: string) => {
    const project = projects.find((p) => p.id === id);
    if (!project) return;

    const newName = prompt("Enter new project name:", project.name);
    if (newName && newName.trim()) {
      await updateProject(id, { name: newName.trim() });
      toast({
        title: "Project renamed",
        description: `Project renamed to "${newName.trim()}".`,
      });
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (projects.length === 1) {
      toast({
        title: "Cannot delete",
        description: "You must have at least one project.",
        variant: "destructive",
      });
      return;
    }

    const project = projects.find((p) => p.id === id);
    if (!project) return;

    if (confirm(`Are you sure you want to delete "${project.name}"?`)) {
      const success = await deleteProject(id);
      if (success && activeProjectId === id) {
        setActiveProjectId(projects[0].id);
      }
    }
  };

  const handleUpdateProject = async (updates: { name?: string; hourlySalary?: number; targetBudget?: number }) => {
    await updateProject(activeProjectId, {
      name: updates.name,
      hourly_salary: updates.hourlySalary,
      target_budget: updates.targetBudget,
    });
  };

  const handleAddPeriod = async (period: Omit<WorkPeriod, "id">) => {
    await addWorkPeriod(activeProjectId, period);
  };

  const handleDeletePeriod = async (periodId: string) => {
    await deleteWorkPeriod(periodId);
  };

  const handleToggleCard = (cardKey: string) => {
    setVisibleCards((prev) => ({
      ...prev,
      [cardKey]: !prev[cardKey],
    }));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading || projectsLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  if (!activeProject) {
    return <div className="min-h-screen bg-background flex items-center justify-center">No projects found</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <ProjectTabs
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={setActiveProjectId}
        onAddProject={handleAddProject}
        onRenameProject={handleRenameProject}
        onDeleteProject={handleDeleteProject}
      />
      <main className="container mx-auto px-6 py-8 space-y-6">
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSettingsOpen(true)}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            Display Settings
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
        <ProjectSettings project={activeProject} onUpdateProject={handleUpdateProject} />
        <KPICards project={activeProject} visibleCards={visibleCards} />
        <BudgetCharts project={activeProject} />
        <WorkPeriods
          project={activeProject}
          onAddPeriod={handleAddPeriod}
          onDeletePeriod={handleDeletePeriod}
        />
      </main>
      <SettingsSidebar
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        visibleCards={visibleCards}
        onToggleCard={handleToggleCard}
      />
    </div>
  );
};

export default Index;
