import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Project } from "@/types/project";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

interface BudgetChartsProps {
  project: Project;
}

const BudgetCharts = ({ project }: BudgetChartsProps) => {
  // Calculate total accumulated cost from work periods
  const totalAccumulatedCost = project.workPeriods.reduce((sum, period) => {
    const periodCost = (period.daysWorked * period.hoursPerDay) * project.hourlySalary;
    return sum + periodCost;
  }, 0);

  const remaining = project.targetBudget - totalAccumulatedCost;
  const isOverBudget = totalAccumulatedCost > project.targetBudget;

  const budgetData = [
    { name: "Accumulated", value: totalAccumulatedCost },
    { name: "Remaining", value: Math.max(0, remaining) },
  ];

  const COLORS = [
    isOverBudget ? "hsl(var(--destructive))" : "hsl(var(--primary))",
    "hsl(var(--chart-3))"
  ];

  const workTypeData = project.workPeriods.reduce((acc, period) => {
    const existing = acc.find((item) => item.name === period.workType);
    if (existing) {
      existing.hours += period.totalHours;
    } else {
      acc.push({ name: period.workType, hours: period.totalHours });
    }
    return acc;
  }, [] as { name: string; hours: number }[]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Budget Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={budgetData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {budgetData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `$${Number(value).toFixed(0)}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hours by Work Type</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={workTypeData}>
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
};

export default BudgetCharts;
