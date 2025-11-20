import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Project } from "@/types/project";

interface ProjectSettingsProps {
  project: Project;
  onUpdateProject: (updates: Partial<Project>) => void;
}

const ProjectSettings = ({ project, onUpdateProject }: ProjectSettingsProps) => {
  const [name, setName] = useState(project.name);
  const [hourlySalary, setHourlySalary] = useState(project.hourlySalary);

  // Keep local state in sync when the active project changes
  useEffect(() => {
    setName(project.name);
    setHourlySalary(project.hourlySalary);
  }, [project.id, project.name, project.hourlySalary]);

  const handleNameBlur = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== project.name) {
      onUpdateProject({ name: trimmed });
    }
  };

  const handleHourlyBlur = () => {
    const value = Number(hourlySalary) || 0;
    if (value !== project.hourlySalary) {
      onUpdateProject({ hourlySalary: value });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Settings for {project.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="projectName">Project Name</Label>
            <Input
              id="projectName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleNameBlur}
              placeholder="Enter project name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hourlySalary">Hourly Salary ($)</Label>
            <Input
              id="hourlySalary"
              type="number"
              value={hourlySalary}
              onChange={(e) => setHourlySalary(Number(e.target.value) || 0)}
              onBlur={handleHourlyBlur}
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectSettings;
