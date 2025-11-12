import { useState } from "react";
import Header from "@/components/Header";
import ProjectTabs from "@/components/ProjectTabs";
import ProjectSettings from "@/components/ProjectSettings";
import KPICards from "@/components/KPICards";
import BudgetCharts from "@/components/BudgetCharts";
import WorkPeriods from "@/components/WorkPeriods";
import { Project, WorkPeriod } from "@/types/project";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([
    {
      id: "1",
      name: "Website Redesign",
      hourlySalary: 75,
      targetBudget: 50000,
      workPeriods: [],
    },
  ]);
  const [activeProjectId, setActiveProjectId] = useState<string>("1");

  const activeProject = projects.find((p) => p.id === activeProjectId);

  const handleAddProject = () => {
    const newProject: Project = {
      id: Date.now().toString(),
      name: `New Project ${projects.length + 1}`,
      hourlySalary: 50,
      targetBudget: 10000,
      workPeriods: [],
    };
    setProjects([...projects, newProject]);
    setActiveProjectId(newProject.id);
    toast({
      title: "Project created",
      description: `${newProject.name} has been created.`,
    });
  };

  const handleRenameProject = (id: string) => {
    const project = projects.find((p) => p.id === id);
    if (!project) return;

    const newName = prompt("Enter new project name:", project.name);
    if (newName && newName.trim()) {
      setProjects(projects.map((p) => (p.id === id ? { ...p, name: newName.trim() } : p)));
      toast({
        title: "Project renamed",
        description: `Project renamed to "${newName.trim()}".`,
      });
    }
  };

  const handleDeleteProject = (id: string) => {
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
      const newProjects = projects.filter((p) => p.id !== id);
      setProjects(newProjects);
      if (activeProjectId === id) {
        setActiveProjectId(newProjects[0].id);
      }
      toast({
        title: "Project deleted",
        description: `"${project.name}" has been deleted.`,
      });
    }
  };

  const handleUpdateProject = (updates: Partial<Project>) => {
    setProjects(projects.map((p) => (p.id === activeProjectId ? { ...p, ...updates } : p)));
  };

  const handleAddPeriod = (period: Omit<WorkPeriod, "id">) => {
    const newPeriod: WorkPeriod = {
      ...period,
      id: Date.now().toString(),
    };
    setProjects(
      projects.map((p) =>
        p.id === activeProjectId ? { ...p, workPeriods: [...p.workPeriods, newPeriod] } : p
      )
    );
  };

  const handleDeletePeriod = (periodId: string) => {
    setProjects(
      projects.map((p) =>
        p.id === activeProjectId
          ? { ...p, workPeriods: p.workPeriods.filter((wp) => wp.id !== periodId) }
          : p
      )
    );
    toast({
      title: "Period deleted",
      description: "Work period has been removed.",
    });
  };

  if (!activeProject) {
    return <div>Loading...</div>;
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
        <ProjectSettings project={activeProject} onUpdateProject={handleUpdateProject} />
        <KPICards project={activeProject} />
        <BudgetCharts project={activeProject} />
        <WorkPeriods
          project={activeProject}
          onAddPeriod={handleAddPeriod}
          onDeletePeriod={handleDeletePeriod}
        />
      </main>
    </div>
  );
};

export default Index;
