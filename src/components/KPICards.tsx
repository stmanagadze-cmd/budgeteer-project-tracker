import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, DollarSign, Target, TrendingDown, TrendingUp } from "lucide-react";
import { Project } from "@/types/project";

interface KPICardsProps {
  project: Project;
  visibleCards: Record<string, boolean>;
}

const KPICards = ({ project, visibleCards }: KPICardsProps) => {
  const totalHours = project.workPeriods.reduce((sum, period) => sum + period.totalHours, 0);
  const totalAccumulated = totalHours * project.hourlySalary;
  const remaining = project.targetBudget - totalAccumulated;
  const progress = project.targetBudget > 0 ? (totalAccumulated / project.targetBudget) * 100 : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const kpis = [
    {
      key: "totalHours",
      title: "Total Hours",
      value: totalHours.toFixed(1),
      icon: Clock,
      color: "text-primary",
    },
    {
      key: "totalAccumulated",
      title: "Total Accumulated",
      value: formatCurrency(totalAccumulated),
      icon: DollarSign,
      color: "text-chart-2",
    },
    {
      key: "targetBudget",
      title: "Target Budget",
      value: formatCurrency(project.targetBudget),
      icon: Target,
      color: "text-chart-3",
    },
    {
      key: "remaining",
      title: "Remaining",
      value: formatCurrency(remaining),
      icon: remaining >= 0 ? TrendingUp : TrendingDown,
      color: remaining >= 0 ? "text-chart-3" : "text-destructive",
    },
    {
      key: "progress",
      title: "Progress",
      value: `${progress.toFixed(1)}%`,
      icon: TrendingUp,
      color: "text-primary",
    },
  ].filter((kpi) => visibleCards[kpi.key]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {kpis.map((kpi) => (
        <Card key={kpi.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle>
            <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default KPICards;
