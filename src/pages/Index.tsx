import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import ProjectTabs from "@/components/ProjectTabs";
import ProjectSettings from "@/components/ProjectSettings";
import KPICards from "@/components/KPICards";
import BudgetCharts from "@/components/BudgetCharts";
import WorkPeriods from "@/components/WorkPeriods";
import SettingsSidebar from "@/components/SettingsSidebar";
import { Project, WorkPeriod } from "@/types/project";
import { useProjects } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { Settings, LogOut } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | undefined>();
  const { projects, loading, addProject, updateProject, deleteProject, addWorkPeriod, deleteWorkPeriod } = useProjects(userId);
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
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id);
    });
  }, []);

  useEffect(() => {
    if (projects.length > 0 && !activeProjectId) {
      setActiveProjectId(projects[0].id);
    }
  }, [projects, activeProjectId]);

  const activeProject = projects.find((p) => p.id === activeProjectId);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleAddProject = async () => {
    const newProjectId = await addProject(`New Project ${projects.length + 1}`);
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
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (projects.length === 1) {
      return;
    }

    const project = projects.find((p) => p.id === id);
    if (!project) return;

    if (confirm(`Are you sure you want to delete "${project.name}"?`)) {
      if (activeProjectId === id) {
        const otherProject = projects.find((p) => p.id !== id);
        if (otherProject) {
          setActiveProjectId(otherProject.id);
        }
      }
      await deleteProject(id);
    }
  };

  const handleUpdateProject = async (updates: Partial<Project>) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.hourlySalary !== undefined) dbUpdates.hourly_salary = updates.hourlySalary;
    if (updates.targetBudget !== undefined) dbUpdates.target_budget = updates.targetBudget;
    
    await updateProject(activeProjectId, dbUpdates);
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

  if (loading || !activeProject) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg">Loading your projects...</div>
        </div>
      </div>
    );
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
            onClick={handleSignOut}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
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
