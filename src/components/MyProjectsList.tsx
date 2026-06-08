import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Project, ProjectCategory } from "@/types/project";
import { FolderOpen } from "lucide-react";

interface MyProjectsListProps {
  projects: Project[];
  categories: ProjectCategory[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
}

const formatDate = (iso?: string) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return "";
  }
};

const MyProjectsList = ({
  projects,
  categories,
  activeProjectId,
  onSelectProject,
}: MyProjectsListProps) => {
  const groups = useMemo(() => {
    const byCategory = new Map<string, Project[]>();
    const order: string[] = [];

    // Pre-seed in alphabetical category order
    categories.forEach((c) => {
      byCategory.set(c.id, []);
      order.push(c.id);
    });
    byCategory.set("__uncategorized__", []);
    order.push("__uncategorized__");

    projects
      .filter((p) => !p.archived)
      .forEach((p) => {
        const key = p.categoryId && byCategory.has(p.categoryId) ? p.categoryId : "__uncategorized__";
        byCategory.get(key)!.push(p);
      });

    return order
      .map((key) => ({
        key,
        label:
          key === "__uncategorized__"
            ? "Uncategorized"
            : categories.find((c) => c.id === key)?.name ?? "Uncategorized",
        items: byCategory.get(key) ?? [],
      }))
      .filter((g) => g.items.length > 0);
  }, [projects, categories]);

  if (projects.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5" />
          My Projects
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {groups.map((group) => (
          <div key={group.key} className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                {group.label}
              </h3>
              <span className="text-xs text-muted-foreground">({group.items.length})</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((p) => {
                const isActive = p.id === activeProjectId;
                const categoryName =
                  categories.find((c) => c.id === p.categoryId)?.name ?? "Uncategorized";
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelectProject(p.id)}
                    className={cn(
                      "text-left border rounded-lg p-4 transition-all hover:shadow-md hover:border-primary/60",
                      isActive ? "border-primary ring-2 ring-primary/30 bg-primary/5" : "bg-card",
                    )}
                  >
                    <div className="font-semibold truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Created {formatDate(p.createdAt)}
                    </div>
                    <Badge variant="secondary" className="mt-2">
                      {categoryName}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default MyProjectsList;
