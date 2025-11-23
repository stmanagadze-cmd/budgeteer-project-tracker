import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, Users } from "lucide-react";
import { DashboardData } from "@/hooks/useDashboardData";

interface DashboardMetricsProps {
  data: DashboardData;
}

export function DashboardMetrics({ data }: DashboardMetricsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <>
      {/* Row 1: Hero Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.currentBalance)}</div>
            <p className="text-xs text-muted-foreground">
              Income - Expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(data.totalIncome)}</div>
            <p className="text-xs text-green-600 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              From paid invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(data.totalExpenses)}</div>
            <p className="text-xs text-red-600 flex items-center gap-1">
              <TrendingDown className="h-3 w-3" />
              Operating costs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activeClients}</div>
            <p className="text-xs text-muted-foreground">
              With unpaid invoices
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Holdbacks & Upcoming Revenue */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Total Holdbacks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600 mb-4">
              {formatCurrency(data.totalHoldbacks)}
            </div>
            {data.holdbacksByCompany.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Breakdown by company:</p>
                {data.holdbacksByCompany.map((item) => (
                  <div key={item.companyName} className="flex justify-between text-sm">
                    <span>{item.companyName}</span>
                    <span className="font-medium">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {formatCurrency(data.upcomingIncome)}
            </div>
            <p className="text-sm text-muted-foreground">
              Total from {data.unpaidInvoices.length} unpaid invoice{data.unpaidInvoices.length !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Accounts Receivable
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
