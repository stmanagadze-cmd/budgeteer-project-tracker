import { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Project } from "@/types/project";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface BudgetChartsProps {
  project: Project;
}

const BudgetCharts = memo(({ project }: BudgetChartsProps) => {
  const chartData = useMemo(() => {
    // Create accumulated cost data per work period
    const accumulatedCostData = project.workPeriods.map((period, index) => ({
      name: `Period ${index + 1}`,
      cost: period.periodCost,
      date: period.date
    }));

    const workTypeData = project.workPeriods.reduce((acc, period) => {
      const existing = acc.find((item) => item.name === period.workType);
      if (existing) {
        existing.hours += period.totalHours;
      } else {
        acc.push({ name: period.workType, hours: period.totalHours });
      }
      return acc;
    }, [] as { name: string; hours: number }[]);

    return { accumulatedCostData, workTypeData };
  }, [project.workPeriods]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Total Accumulated Money</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.accumulatedCostData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `$${Number(value).toFixed(0)}`} />
              <Bar dataKey="cost" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hours by Work Type</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.workTypeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="hours" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
});

BudgetCharts.displayName = 'BudgetCharts';

export default BudgetCharts;
