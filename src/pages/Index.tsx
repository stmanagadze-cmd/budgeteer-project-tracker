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
import MyProjectsList from "@/components/MyProjectsList";
import ManageProjectCategoriesDialog from "@/components/ManageProjectCategoriesDialog";
import ProjectFormDialog from "@/components/ProjectFormDialog";
import { Project, WorkPeriod } from "@/types/project";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Settings, LogOut, FileDown, FileText } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { useProjectCategories } from "@/hooks/useProjectCategories";

const Index = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | undefined>();
  const {
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
    setProjectArchived,
    setWorkPeriodArchived,
  } = useProjects(userId);
  const { categories, addCategory, renameCategory, deleteCategory } = useProjectCategories(userId);
  const [activeProjectId, setActiveProjectId] = useState<string>("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [categoriesDialogOpen, setCategoriesDialogOpen] = useState(false);
  const [projectFormDialog, setProjectFormDialog] = useState<{
    open: boolean;
    mode: "create" | "edit";
    projectId?: string;
  }>({ open: false, mode: "create" });
  const [sortBy, setSortBy] = useState<"date" | "totalHours" | "periodCost">("date");
  const [visibleCards, setVisibleCards] = useState({
    totalHours: true,
    totalAccumulated: true,
    targetBudget: false,
    remaining: false,
    progress: false,
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
        await addProject({
          name: `New Project 1`,
          hourlySalary: 50,
          targetBudget: 10000,
        });
      } else if (projects.length > 0 && !activeProjectId) {
        setActiveProjectId(projects[0].id);
      }
    };
    initializeProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, activeProjectId, loading]);

  const activeProject = projects.find((p) => p.id === activeProjectId);

  const openCreateProject = () => {
    setProjectFormDialog({ open: true, mode: "create" });
  };

  const openRenameProject = (id: string) => {
    setProjectFormDialog({ open: true, mode: "edit", projectId: id });
  };

  const handleProjectFormSubmit = async ({ name, categoryId }: { name: string; categoryId: string | null }) => {
    if (projectFormDialog.mode === "create") {
      const id = await addProject({
        name,
        hourlySalary: 50,
        targetBudget: 10000,
        categoryId,
      });
      if (id) setActiveProjectId(id);
    } else if (projectFormDialog.projectId) {
      await updateProject(projectFormDialog.projectId, { name, categoryId });
      toast({ title: "Project updated" });
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
    return await addWorkPeriod(activeProjectId, period);
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
        body: {
          project: activeProject,
          visibleCards: visibleCards,
          sortBy: sortBy,
        },
      });

      if (error) throw error;

      const today = new Date().toISOString().split('T')[0];
      const fileName = `${activeProject.name.replace(/[^a-zA-Z0-9]/g, '_')}_export_${today}.html`;

      const blob = new Blob([data], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
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

  const editingProject =
    projectFormDialog.mode === "edit" && projectFormDialog.projectId
      ? projects.find((p) => p.id === projectFormDialog.projectId)
      : undefined;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <ProjectTabs
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={setActiveProjectId}
        onAddProject={openCreateProject}
        onRenameProject={openRenameProject}
        onDeleteProject={handleDeleteProject}
        onArchiveProject={setProjectArchived}
        onManageCategories={() => setCategoriesDialogOpen(true)}
      />
      <main className="container mx-auto px-6 py-8 space-y-6">
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/invoices")} className="gap-2">
            <FileText className="h-4 w-4" />
            Invoices
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-2">
            <FileDown className="h-4 w-4" />
            Export Report
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)} className="gap-2">
            <Settings className="h-4 w-4" />
            Display Settings
          </Button>
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        <MyProjectsList
          projects={projects}
          categories={categories}
          activeProjectId={activeProjectId}
          onSelectProject={setActiveProjectId}
        />

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
          onArchivePeriod={setWorkPeriodArchived}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />
      </main>
      <SettingsSidebar
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        visibleCards={visibleCards}
        onToggleCard={handleToggleCard}
      />

      <ManageProjectCategoriesDialog
        open={categoriesDialogOpen}
        onOpenChange={setCategoriesDialogOpen}
        categories={categories}
        onAdd={addCategory}
        onRename={renameCategory}
        onDelete={deleteCategory}
      />

      <ProjectFormDialog
        open={projectFormDialog.open}
        onOpenChange={(open) => setProjectFormDialog((s) => ({ ...s, open }))}
        title={projectFormDialog.mode === "create" ? "New Project" : "Edit Project"}
        initialName={editingProject?.name ?? `New Project ${projects.length + 1}`}
        initialCategoryId={editingProject?.categoryId ?? null}
        categories={categories}
        onSubmit={handleProjectFormSubmit}
      />
    </div>
  );
};

export default Index;
