import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Project } from "@/types/project";
interface ProjectSettingsProps {
  project: Project;
  onUpdateProject: (updates: Partial<Project>) => void;
}
const ProjectSettings = ({
  project,
  onUpdateProject
}: ProjectSettingsProps) => {
  return <Card>
      <CardHeader>
        <CardTitle>Project Settings for {project.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="projectName">Project Name</Label>
            <Input id="projectName" value={project.name} onChange={e => onUpdateProject({
            name: e.target.value
          })} placeholder="Enter project name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hourlySalary">Hourly Salary ($)</Label>
            <Input id="hourlySalary" type="number" value={project.hourlySalary} onChange={e => onUpdateProject({
            hourlySalary: parseFloat(e.target.value) || 0
          })} placeholder="0.00" min="0" step="0.01" />
          </div>
          
        </div>
      </CardContent>
    </Card>;
};
export default ProjectSettings;