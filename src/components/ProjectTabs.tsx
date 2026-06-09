import { Plus, MoreVertical, Trash2, Edit2, Archive, ArchiveRestore, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Project } from "@/types/project";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

interface ProjectTabsProps {
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onAddProject: () => void;
  onRenameProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onArchiveProject?: (id: string, archived: boolean) => void;
}

const ProjectTabs = ({
  projects,
  activeProjectId,
  onSelectProject,
  onAddProject,
  onRenameProject,
  onDeleteProject,
  onArchiveProject,
}: ProjectTabsProps) => {
  const [showArchived, setShowArchived] = useState(false);

  const visibleProjects = useMemo(
    () => projects.filter((p) => (showArchived ? true : !p.archived)),
    [projects, showArchived],
  );

  const archivedCount = projects.filter((p) => p.archived).length;

  return (
    <div className="bg-card border-b border-border">
      <div className="container mx-auto px-6 py-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          <Button
            onClick={onAddProject}
            className="flex-shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
          >
            <Plus className="h-4 w-4 mr-1" />
            New Project
          </Button>
          {archivedCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="flex-shrink-0"
              onClick={() => setShowArchived((v) => !v)}
              title={showArchived ? "Hide archived" : "Show archived"}
            >
              {showArchived ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              {showArchived ? "Hide archived" : `Show archived (${archivedCount})`}
            </Button>
          )}
          {visibleProjects.map((project) => {
            const isActive = activeProjectId === project.id;
            const isArchived = !!project.archived;
            return (
              <div key={project.id} className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant={isActive ? "default" : "ghost"}
                  onClick={() => onSelectProject(project.id)}
                  className={cn(
                    "rounded-r-none",
                    isActive && "bg-primary text-primary-foreground hover:bg-primary/90",
                    isArchived && "opacity-60 italic",
                  )}
                >
                  {project.name}
                  {isArchived && <span className="ml-2 text-xs">(archived)</span>}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      size="icon"
                      className={cn(
                        "rounded-l-none h-10 w-10",
                        isActive && "bg-primary text-primary-foreground hover:bg-primary/90",
                        isArchived && "opacity-60",
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
                    {onArchiveProject && (
                      <DropdownMenuItem
                        onClick={() => onArchiveProject(project.id, !isArchived)}
                      >
                        {isArchived ? (
                          <>
                            <ArchiveRestore className="h-4 w-4 mr-2" />
                            Restore
                          </>
                        ) : (
                          <>
                            <Archive className="h-4 w-4 mr-2" />
                            Archive
                          </>
                        )}
                      </DropdownMenuItem>
                    )}
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
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ProjectTabs;
