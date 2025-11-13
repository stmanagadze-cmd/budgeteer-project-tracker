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
import { Project, WorkPeriod } from "@/types/project";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Settings, LogOut, FileDown } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";

const Index = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | undefined>();
  const { projects, loading, addProject, updateProject, deleteProject, addWorkPeriod, updateWorkPeriod, deleteWorkPeriod, uploadWorkPeriodImage, deleteWorkPeriodImage } = useProjects(userId);
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUserId(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUserId(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const initializeProject = async () => {
      if (!loading && projects.length === 0) {
        // Create a default project if none exist
        await handleAddProject();
      } else if (projects.length > 0 && !activeProjectId) {
        setActiveProjectId(projects[0].id);
      }
    };
    initializeProject();
  }, [projects, activeProjectId, loading]);

  const activeProject = projects.find((p) => p.id === activeProjectId);

  const handleAddProject = async () => {
    const newProjectId = await addProject({
      name: `New Project ${projects.length + 1}`,
      hourlySalary: 50,
      targetBudget: 10000,
    });
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
      await deleteProject(id);
      if (activeProjectId === id) {
        const remainingProjects = projects.filter((p) => p.id !== id);
        if (remainingProjects.length > 0) {
          setActiveProjectId(remainingProjects[0].id);
        }
      }
    }
  };

  const handleUpdateProject = async (updates: Partial<Project>) => {
    await updateProject(activeProjectId, updates);
  };

  const handleAddPeriod = async (period: Omit<WorkPeriod, "id">) => {
    await addWorkPeriod(activeProjectId, period);
  };

  const handleDeletePeriod = async (periodId: string) => {
    await deleteWorkPeriod(periodId);
  };

  const handleUpdatePeriod = async (periodId: string, period: Partial<WorkPeriod>) => {
    await updateWorkPeriod(periodId, period);
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

  const handleExportPDF = async () => {
    if (!activeProject) return;

    try {
      toast({
        title: "Generating Report",
        description: "Please wait while we generate your report...",
      });

      const { data, error } = await supabase.functions.invoke('generate-pdf-report', {
        body: { project: activeProject },
      });

      if (error) throw error;

      // Create a blob from the HTML response
      const blob = new Blob([data], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${activeProject.name.replace(/[^a-zA-Z0-9]/g, '_')}_report.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Report Generated",
        description: "Your HTML report has been downloaded. Open it in a browser and use Print to save as PDF.",
      });
    } catch (error: any) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate report.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  if (!activeProject) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Initializing...</div>;
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
            onClick={handleExportPDF}
            className="gap-2"
          >
            <FileDown className="h-4 w-4" />
            Export Report
          </Button>
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
          onUpdatePeriod={handleUpdatePeriod}
          onDeletePeriod={handleDeletePeriod}
          onUploadImage={uploadWorkPeriodImage}
          onDeleteImage={deleteWorkPeriodImage}
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
