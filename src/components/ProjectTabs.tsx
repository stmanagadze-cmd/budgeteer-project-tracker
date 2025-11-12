import { Plus, MoreVertical, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Project } from "@/types/project";
import { cn } from "@/lib/utils";

interface ProjectTabsProps {
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onAddProject: () => void;
  onRenameProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
}

const ProjectTabs = ({
  projects,
  activeProjectId,
  onSelectProject,
  onAddProject,
  onRenameProject,
  onDeleteProject,
}: ProjectTabsProps) => {
  return (
    <div className="bg-card border-b border-border">
      <div className="container mx-auto px-6 py-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          {projects.map((project) => (
            <div key={project.id} className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant={activeProjectId === project.id ? "default" : "ghost"}
                onClick={() => onSelectProject(project.id)}
                className={cn(
                  "rounded-r-none",
                  activeProjectId === project.id && "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {project.name}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={activeProjectId === project.id ? "default" : "ghost"}
                    size="icon"
                    className={cn(
                      "rounded-l-none h-10 w-10",
                      activeProjectId === project.id && "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover z-50">
                  <DropdownMenuItem onClick={() => onRenameProject(project.id)}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDeleteProject(project.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
          <Button onClick={onAddProject} size="icon" variant="outline" className="flex-shrink-0">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProjectTabs;
