import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpenseCategory, Expense } from "@/types/expense";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ExpenseBreakdownProps {
  expenses: Expense[];
  categories: ExpenseCategory[];
  hierarchicalCategories: ExpenseCategory[];
}

export const ExpenseBreakdown = ({
  expenses,
  categories,
  hierarchicalCategories,
}: ExpenseBreakdownProps) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Calculate totals by category
  const getCategoryTotal = (categoryId: string): number => {
    return expenses
      .filter((exp) => exp.category_id === categoryId)
      .reduce((sum, exp) => sum + exp.amount, 0);
  };

  // Calculate total including children
  const getCategoryTotalWithChildren = (category: ExpenseCategory): number => {
    let total = getCategoryTotal(category.id);
    if (category.children) {
      category.children.forEach((child) => {
        total += getCategoryTotal(child.id);
      });
    }
    return total;
  };

  const uncategorizedTotal = expenses
    .filter((exp) => !exp.category_id)
    .reduce((sum, exp) => sum + exp.amount, 0);

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  // Prepare chart data
  const chartData = [
    ...hierarchicalCategories.map((cat) => ({
      name: cat.name,
      value: getCategoryTotalWithChildren(cat),
      color: cat.color,
    })),
    ...(uncategorizedTotal > 0
      ? [{ name: "Uncategorized", value: uncategorizedTotal, color: "#9CA3AF" }]
      : []),
  ].filter((d) => d.value > 0);

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expense Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div className="h-[250px]">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No expenses recorded
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Category List with Drill-down */}
          <div className="space-y-2">
            {hierarchicalCategories.map((category) => {
              const total = getCategoryTotalWithChildren(category);
              const isExpanded = expandedCategories.has(category.id);
              const hasChildren = category.children && category.children.length > 0;

              return (
                <div key={category.id}>
                  <button
                    onClick={() => hasChildren && toggleCategory(category.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors",
                      hasChildren && "cursor-pointer"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {hasChildren ? (
                        isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )
                      ) : (
                        <div className="w-4" />
                      )}
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="font-medium">{category.name}</span>
                    </div>
                    <span className="font-medium text-destructive">
                      {formatCurrency(total)}
                    </span>
                  </button>

                  {isExpanded && category.children && (
                    <div className="ml-8 space-y-1 mt-1">
                      {category.children.map((child) => {
                        const childTotal = getCategoryTotal(child.id);
                        return (
                          <div
                            key={child.id}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: child.color }}
                              />
                              <span className="text-sm">{child.name}</span>
                            </div>
                            <span className="text-sm text-destructive">
                              {formatCurrency(childTotal)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {uncategorizedTotal > 0 && (
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                <div className="flex items-center gap-2">
                  <div className="w-4" />
                  <div className="w-3 h-3 rounded-full bg-gray-400" />
                  <span className="font-medium">Uncategorized</span>
                </div>
                <span className="font-medium text-destructive">
                  {formatCurrency(uncategorizedTotal)}
                </span>
              </div>
            )}

            <div className="border-t pt-2 mt-2">
              <div className="flex items-center justify-between p-2 font-semibold">
                <span>Total Expenses</span>
                <span className="text-destructive">{formatCurrency(totalExpenses)}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
